'use strict'
/**
 * sqlite-tree-store
 * Copyright(c) 2019 Dennis B. <denesey@gmail.com>
 * MIT Licensed
 */

const sqlite = require('better-sqlite3')

/**
* @typedef {import('better-sqlite3')} BetterSqlite3
*/

/**
 * The the main and only module export
 * @param {(string|BetterSqlite3)} db Full/relative database file name, or BetterSqlite3.Database instance
 * @param {string} tableName Name of the table, where opened/created model is stored
 * @return {tree} result
*/
module.exports = function (db, tableName = 'tree') {
	if (typeof db === 'string') {
		db = sqlite(db)
	}

	(function () { // self-calling at startup, ensures db has proper structures
		let existance = (name, type) => `SELECT name FROM sqlite_master WHERE type='${type}' AND name='${name}'`

		let entities = [
			{
				exists: existance(tableName, 'table'),
				definitions: [
					`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY ASC AUTOINCREMENT, idp INTEGER REFERENCES ${tableName} (id) ON DELETE CASCADE, name STRING NOT NULL, type STRING, value STRING)`,
					`CREATE UNIQUE INDEX ${tableName}_unique ON ${tableName} (idp, name)`,
					`INSERT INTO ${tableName} (id, idp, name) values (0, 0, '_root_')`
				]
			},
			{
				exists: existance('v_' + tableName, 'view'),
				definitions: [`CREATE VIEW v_${tableName} AS\n` +
					`WITH RECURSIVE nested (id, level, path)\n` +
					`AS (\n` +
					`    SELECT \n` +
					`        id,\n` +
					`        0,\n` +
					`        name\n` +
					`    FROM \n` +
					`        ${tableName}\n` +
					`    WHERE \n` +
					`        idp = 0 and id != idp\n` +
					`    UNION\n` +
					`    SELECT \n` +
					`        n.id,\n` +
					`        nested.level + 1,\n` +
					`        nested.path || '/' || name\n` +
					`    FROM\n` +
					`        ${tableName} n,\n` +
					`        nested\n` +
					`    WHERE\n` +
					`        n.idp = nested.id\n` +
					`)\n` +
					`SELECT \n` +
					`    nested.path,\n` +
					`    n.id,\n` +
					`    replace(hex(zeroblob(level * 6)), '00', ' ') || n.name AS name,\n` +
					`    n.type,\n` +
					`    n.value\n` +
					`FROM \n` +
					`    nested,\n` +
					`    ${tableName} n\n` +
					`WHERE\n` +
					`    n.id = nested.id\n` +
					`ORDER BY \n` +
					`    nested.path`
				]
			}
		]

		for (let entity of entities) {
			if (!db.prepare(entity.exists).get()) {
				for (let statement of entity.definitions) db.prepare(statement).run()
			}
		}
	})()

	let selectNode = db.prepare(`select * from ${tableName} where idp = ? and name = ?`)
	let selectNodes = db.prepare(`select * from ${tableName} where idp = ? and id != idp`)
	let insertNode = db.prepare(`insert into ${tableName} (idp, name, type, value) values ($idp, $name, $type, $value)`)
	let deleteNode = db.prepare(`delete from ${tableName} where id = $id`)
	let updateValue = db.prepare(`update ${tableName} set value = $value, type = $type where id = $id`)
	let renameNode = db.prepare(`update ${tableName} set name = $name where id = $id`)

	function _setHiddenProperty (target, key, value) {
		return Object.defineProperty(target, key, { enumerable: false, configurable: true, value: value })
	}

	function _renameProperty (node, meta, oldKey, newKey) {
		if (newKey in node || !(oldKey in node) || !('id' in meta[oldKey])) return null
		node[newKey] = node[oldKey]
		meta[newKey].id = meta[oldKey].id
		renameNode.run({ id: meta[oldKey].id, name: newKey })
		delete node[oldKey]
		delete meta[oldKey]
		return node[newKey]
	}

	// to db value & type conversion helper
	function _toDbType (value) {
		let type = typeof value
		let primitive = null // for container types (objects, arrays) primitive stay's as null
		if (value === null) return { primitive, type }
		switch (value.constructor) {
		case Array: type = 'array'; break
		case Object: break
		case Buffer: type = 'buffer'; primitive = value; break
		case Function: primitive = value.toString(); break
		case Date: type = 'date'; primitive = value.toISOString(); break
		case Boolean: type = 'boolean'; primitive = (value) ? 1 : 0; break
		case String:
		case Number: primitive = value
		}
		return { primitive, type }
	}

	// from db value & type conversion helper
	function _fromDbType ({ type, value, id }) {
		switch (type) {
		case 'array': return createNode(id, [])
		case 'object': return createNode(id, {})
		case 'buffer': return Buffer.from(value)
		case 'date': return new Date(value)
		case 'function': return String(value) // -- dummy
		case 'boolean':	return Boolean(value)
		case 'string': return String(value)
		default: return value
		}
	}

	function createNode (id, source = {}) {
		// meta-data for id, type, rename and other maybe...
		const meta = new Proxy({}, {
			set (target, key, value, receiver) {
				return Reflect.set(source, key, value) // note: set original node <source> (not target or receiver)
			},
			get (target, key, receiver) {
				if (!Reflect.has(target, key)) { // bypass non-existent meta keys
					_setHiddenProperty(target, key, {
						id: null,
						rename: (newKey) =>	_renameProperty(source, meta, key, newKey)
					})
				}
				return Reflect.get(target, key)
			}
		})

		return new Proxy(source, {
			set (target, key, value, receiver) {
				let { primitive, type } = _toDbType(value)
				let node

				if (!Reflect.has(target, key)) {
					meta[key].id = insertNode.run({ idp: id, name: key, type: type, value: primitive }).lastInsertRowid
					if (primitive === null) node = _fromDbType({ type, id: meta[key].id })
				} else {
					updateValue.run({ id: meta[key].id, type: type, value: primitive })
					if (primitive === null) node = receiver[key]
				}
				// meta[key].type = type

				if (node) {
					for (let subKey in value) {
						node[subKey] = value[subKey] // note: (re)assigning proxified node causes recursive set() calling
					}
					value = node
				}
				return Reflect.set(target, key, value)
			},

			get (target, key, receiver) {
				if (Reflect.has(target, key)) {
					return Reflect.get(target, key)
				} else if (key === '_') {
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

	/**
	* Build tree store from database
	*
	* @param {string[]} [path] (optional) array of strings representing path to node
	* @param {number} [depth] (optional) build to desired depth
	* @return {Proxy} result
	*/
	function tree (path = [], depth) {
		// -
		let root = { id: 0, type: 'object' }
		for (let name of path) {
			root = selectNode.get(root.id, name)
			if (!root) throw new Error('The specified path does not exist')
		}

		function _build (node, children, level) {
			for (let child of children) {
				let nodeValue = _fromDbType(child)
				node._[child.name].id = child.id
				if ((child.type === 'object' || child.type === 'array') && !(depth <= level + 1)) {
					node._[child.name] = _build(nodeValue, selectNodes.all(child.id), level + 1)
				} else {
					node._[child.name] = nodeValue
				}
			}
			return node
		}
		return _build(_fromDbType(root), selectNodes.all(root.id), 0)
	}

	return tree
}
