'use strict'

const sqlite = require('better-sqlite3')

module.exports = function (db, commonName, forceArrays = false) {
	// -
	const _NODES = commonName + '_nodes'
	const _VALUES = commonName + '_values'

	if (typeof db === 'string') {
		db = sqlite(db)
	}

	(function () { // self-calling at startup, ensures given db has proper structures
		let existance = (name, type) => `SELECT name FROM sqlite_master WHERE type='${type}' AND name='${name}'`

		let entities = [
			{
				exists: existance(_NODES, 'table'),
				definitions: [
					`CREATE TABLE ${_NODES} (id INTEGER PRIMARY KEY ASC AUTOINCREMENT, idp INTEGER REFERENCES ${_NODES} (id) ON DELETE CASCADE, name STRING NOT NULL)`,
					`CREATE UNIQUE INDEX ${_NODES}_unique ON ${_NODES} (idp, name)`,
					`INSERT INTO ${_NODES} (id, idp, name) values (0, 0, 'root')`
				]
			},
			{
				exists: existance(_VALUES, 'table'),
				definitions: [`CREATE TABLE ${_VALUES} (id INTEGER REFERENCES ${_NODES} (id) ON DELETE CASCADE, value STRING)`,
					`CREATE INDEX ${_VALUES}_id ON ${_VALUES} (id ASC)`
				]
			},
			{
				exists: existance(commonName + '_recursive', 'view'),
				definitions: [`CREATE VIEW ${commonName}_recursive AS\n` +
					`WITH RECURSIVE nested (id, level, path)\n` +
					`AS (\n` +
					`    SELECT \n` +
					`        id,\n` +
					`        0,\n` +
					`        name\n` +
					`    FROM \n` +
					`        ${_NODES}\n` +
					`    WHERE \n` +
					`        idp = 0 and id != idp\n` +
					`    UNION\n` +
					`    SELECT \n` +
					`        n.id,\n` +
					`        nested.level + 1,\n` +
					`        nested.path || '/' || name\n` +
					`    FROM\n` +
					`        ${_NODES} n,\n` +
					`        nested\n` +
					`    WHERE\n` +
					`        n.idp = nested.id\n` +
					`)\n` +
					`SELECT \n` +
					`    nested.path,\n` +
					`    n.id,\n` +
					`    replace(hex(zeroblob(level * 6)), '00', ' ') || n.name AS name,\n` +
					`    v.value\n` +
					`FROM \n` +
					`    nested,\n` +
					`    ${_NODES} n left join ${_VALUES} v on n.id = v.id\n` +
					`WHERE\n` +
					`    n.id = nested.id\n` +
					`ORDER BY \n` +
					`    nested.path`]
			}
		]

		for (let entity of entities) {
			if (!db.prepare(entity.exists).get()) {
				for (let statement of entity.definitions) db.prepare(statement).run()
			}
		}
	})()

	let selectNodes = db.prepare(`select * from ${_NODES} where idp = ? and id != idp`)
	let insertNode = db.prepare(`insert into ${_NODES} (idp, name) values ($idp, $name)`)
	let deleteNode = db.prepare(`delete from ${_NODES} where id = $id`)

	let selectValues = db.prepare(`select value from ${_VALUES} where id = ?`)
	let insertValue = db.prepare(`insert into ${_VALUES} (id, [value]) values ($id, $value)`)
	let updateValue = db.prepare(`update ${_VALUES} set value = $value where id = $id`)

	function createNode (id, source = {}) {
		// meta-data for <source> (<id> and other maybe...)
		const meta = new Proxy({}, {
			set (target, key, value, receiver) {
				return Reflect.set(source, key, value) // !!! - proxify setter to original <source>
			},
			get (target, key, receiver) {
				if (!Reflect.has(target, key)) { // bypass non-existent yet meta keys
					let obj = {}
					Object.defineProperty(target, key, { enumerable: false, configurable: true, value: obj })
					return obj
				}
				return Reflect.get(target, key)
			}
		})

		return new Proxy(source, {
			set (target, key, value, receiver) {
				if (typeof value === 'boolean') value = (value) ? 1 : 0

				if (Reflect.has(target, key)) {
					if (typeof value !== 'object') {
						updateValue.run({ id: meta[key].id, value: value })
					} else {
						for (let subKey in value) {
							receiver[key][subKey] = value[subKey]
						}
					}
				} else {
					let info = insertNode.run({ idp: id, name: key })
					let _id = info.lastInsertRowid
					meta[key].id = _id
					// Object.defineProperty(meta[key], 'id', { enumerable: true, writable: false, value: _id  })
					if (typeof value !== 'object') {
						insertValue.run({ id: _id, value: value })
					} else {
						let isArray = forceArrays && Reflect.has(value, 'length')
						let node = createNode(_id, isArray ? [] : {})
						if (isArray) insertValue.run({ id: _id, value: '[]' })
						for (let subKey in value) {
							node[subKey] = value[subKey] // assign proxified 'node' causes recursive call of 'set'
						}
						// target[key] = node // replace already assigned by just created
						value = node
					}
				}
				return Reflect.set(target, key, value)
			},

			get (target, key, receiver) {
				if (Reflect.has(target, key)) {
					let value = target[key]
					if (value === null) return createNode(meta[key].id)
					return value
				}
				if (key === '_') {
					return meta
				}
				return undefined
			},

			deleteProperty (target, key) {
				if (Reflect.has(target, key)) {
					deleteNode.run({ id: meta[key].id })
					delete meta[key]
					return Reflect.deleteProperty(target, key)
				}
				return false
			}
		})
	}

	function build (id = 0, depth) {
	/*
		recursive build from node.id==<id>, to given <depth> level
		when (<id> == 0) - build from root
		when (<depth> is not defined or 0) - build whole tree deep
	*/
		function _build (id, level) { // returns: value, [...values] or Proxy(<node>)
			let children = selectNodes.all(id)
			let values = selectValues.all(id)
			let value
			if (values.length === 0) value = null
			else if (values.length === 1) value = values[0].value
			else value = values.map(el => el.value) // fallback to Array when multiple vals
			if (id && children.length === 0) {
				// no children means, there is a 'leaf'
				return value
			}
			if (depth && level >= depth) return
			let isArray = forceArrays && (value === '[]')  // children.length && children.reduce((res, el) =>  res && !isNaN(el.name), true)
			let node = createNode(id, isArray ? [] : {})
			for (let child of children) {
				let childNode = _build(child.id, level + 1) // <-- note: recursive
				node._[child.name].id = child.id
				node._[child.name] = childNode
			}
			return node
		}
		return _build(id, 0)
	}

	return build
}
