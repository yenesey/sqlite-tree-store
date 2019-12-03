'use strict'

/**
 * setup environment
 */
const expect = require('chai').expect
const fs = require('fs')
const TESTDB = 'test.db'
if (fs.existsSync(TESTDB)) fs.unlinkSync(TESTDB)

const sqlite = require('better-sqlite3')
const treeStore = require('./index')

const db = sqlite(TESTDB)
const tree = treeStore(db, 'sys')

var t = tree()

/**
 * setup test data
 */
const json = JSON.parse(fs.readFileSync('package.json'))
t.json = json
t.node = {
	bool: true,
	numstr: '7',
	array: [1, 2, 3, 4, '5'],
	subnode: { 
		flag: false 
	},
}
t.emptyObject = {}
t.emptyArray = []

/**
 * begin tests:
 */

t = tree() // -- rebuild whole tree from db
expect(t).to.be.a('object')
expect(t.json).to.deep.equal(json)
expect(t._.node.id).to.be.a('number')
expect(t.node.bool).to.be.a('boolean')
expect(t.node.numstr).to.be.a('string')
expect(t.node.array).to.be.a('array')
expect(t.node.array[4]).to.be.a('string').to.be.equal('5')
t.emptyObject.date = '01-01-1981'
t.emptyArray.push('01-01-1981')

t = tree() // -- rebuild whole tree from db
expect(t.emptyObject.date).to.be.equal('01-01-1981')
expect(t.emptyArray[0]).to.be.equal('01-01-1981')

t = tree(['json']) // -- rebuild exact given node from db
expect(t).to.deep.equal(json)

t = tree(['node'], 1) // -- rebuild exact given node 1 level deep
expect(t).to.deep.equal({ array: [], bool: true, numstr: '7', subnode: {} })

t = tree([], 2) // -- rebuild root node 2 levels deep
expect(t.node).to.deep.equal({ array: [], bool: true, numstr: '7', subnode: {} })

console.log('All tests passed!')
console.log('Cleanup...')
db.close()
//fs.unlinkSync(TESTDB)
