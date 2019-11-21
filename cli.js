'use strict'

const repl = require('repl')
const path = require('path')
const fs = require('fs')
const { writeFileSync, readFileSync } = require('fs')
const { inspect } = require('util')
const mark = (text) => `\x1b[32m${text}\x1b[39m` // => `\x1b[32m${text}\x1b[37m`

var fileName = process.argv[2]
var commonName = process.argv[3]

if (!(fileName && commonName)) {
	console.log('USAGE:\n\\>node cli <dbFileName.ext> <commonName>')
	process.exit(-1)
}

if (!path.isAbsolute(fileName)) {
	fileName = path.join(require.main.path, fileName)
}

if (!fs.existsSync(fileName)) {
	console.log(`Seems given file [${mark(fileName)}] is not exists.\nAttempted to create it now... `)
}

const treeBuilder = require('./index')
const tree = treeBuilder(fileName, commonName, true)

console.log('*** interactive \'tree\' edit ***\n' +
'type:\n > ' + mark('t') +
' - view tree\n > ' + mark('keys(t)') +
' - view keys\n > ' + mark('save(t.<node>, <fileName>)') +
' - save to file\n > ' + mark('load(<fileName>)') +
' - load from file\npress Ctrl+D to stop')

const context = repl.start({
	writer: (result) => inspect(result, { colors: true, depth: 2 })
}).context
context.keys = Object.keys
context.t = tree()
context.save = function (node, fileName) {
	writeFileSync(fileName, JSON.stringify(node, '', '    '))
	return true
}
context.load = function (fileName) {
	return JSON.parse(readFileSync(fileName))
}
