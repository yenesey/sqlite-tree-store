'use strict'

/**
 * setup environment
 */
const TESTDB = 'test.db'
const fs = require('fs')
const expect = require('chai').expect
const sqlite = require('better-sqlite3')
const treeStore = require('./index')

cleanup()
const db = sqlite(TESTDB, { memory: process.argv[2] === 'memory' })
const tree = treeStore(db, 'sys')

function cleanup () {
	if (fs.existsSync(TESTDB)) fs.unlinkSync(TESTDB)
}

/**
 * setup test data
 */
console.time('All tests passed!')
const json = process.config
const buffer  = Buffer.from([0, 0, 0, 0, 0, 0, 128, 255])
var t = tree()
t.json = json
t.buffer = buffer
t.node = {
	bool: true,
	numstr: '7',
	array: [1, 2, 3, 4, '5'],
	subnode: {
		flag: false
	}
}
t.emptyObject = {}
t.emptyArray = []

/**
 * begin tests:
 */

t = tree() // -- rebuild whole tree from db
expect(t).to.be.a('object')
expect(t._.node.id).to.be.a('number')
expect(t.node.bool).to.be.a('boolean')
expect(t.node.numstr).to.be.a('string')
expect(t.node.array).to.be.a('array')
expect(t.node.array[4]).to.be.a('string').to.be.equal('5')
expect(t.json).to.be.deep.equal(json)
expect(t.buffer).to.be.deep.equal(buffer)

var dt = new Date()
t.emptyObject.date = dt
t.emptyArray.push(dt)

t = tree() // -- rebuild whole tree from db
expect(t.emptyObject.date).to.be.a('date')
expect(t.emptyArray[0]).to.be.a('date')
expect(t.emptyObject.date.getTime()).to.be.equal(dt.getTime())
expect(t.emptyArray[0].getTime()).to.be.equal(dt.getTime())

t = tree(['json']) // -- rebuild exact given node from db
expect(t).to.deep.equal(json)

t = tree(['node'], 1) // -- rebuild exact given node 1 level deep
expect(t).to.deep.equal({ array: [], bool: true, numstr: '7', subnode: {} })

t = tree([], 2) // -- rebuild root node 2 levels deep
expect(t.node).to.deep.equal({ array: [], bool: true, numstr: '7', subnode: {} })

t._.node.rename('node_new') // rename node -> node_new
t._.node_new.rename('node_new2') // rename again

t = tree([], 2)
expect(t.node_new2).to.deep.equal({ array: [], bool: true, numstr: '7', subnode: {} })
expect(t.node).to.be.undefined

console.timeEnd('All tests passed!')
console.log('Cleanup...')
db.close()
cleanup()
