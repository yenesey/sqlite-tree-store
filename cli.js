#!/usr/bin/env node
'use strict'

const repl = require('repl')
const path = require('path')
const fs = require('fs')
const { writeFileSync, readFileSync } = require('fs')
const { inspect } = require('util')
const mark = (text) => `\x1b[32m${text}\x1b[39m` // => `\x1b[32m${text}\x1b[37m`

var fileName = process.argv[2]
var tableName = process.argv[3]
var pathToNode = process.argv[4] ? process.argv[4].split('/') : []

if (!(fileName)) {
	console.log('usage:\n\\>node cli <db_file_name> [<table_name> [path/to/node]]')
	process.exit(-1)
}

if (!path.isAbsolute(fileName)) {
	fileName = path.join(__dirname, fileName)
}

if (!fs.existsSync(fileName)) {
	console.log(`It seems like db file [${mark(fileName)}] is not exists.\nAttempt to create it now... `)
}

const treeBuilder = require('./index')
const tree = treeBuilder(fileName, tableName || undefined)

console.log('*** Interactive \'tree\' editor ***\n' +
'type:\n > ' + mark('t') +
' - view tree\n > ' + mark('keys(t)') +
' - view keys\n > ' + mark('save(t.<node>, <fileName>)') +
' - save to file\n > ' + mark('load(<fileName>)') +
' - load from file\npress Ctrl+D to stop')

const context = repl.start({
	useGlobal: true,
	writer: (result) => inspect(result, { colors: true, depth: 2 })
}).context
context.keys = Object.keys
context.t = tree(pathToNode)
context.save = function (node, fileName) {
	writeFileSync(fileName, JSON.stringify(node, '', '    '))
	return true
}
context.load = function (fileName) {
	return JSON.parse(readFileSync(fileName))
}
