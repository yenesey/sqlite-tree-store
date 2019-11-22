# SQLite Tree Store
## A simple document store over SQLite
This module is suitable in cases when you need:
- a simple schema-less store for quick prototyping (like "mongo on minimals")
- to store config data in SQLite instead of .json files
- combined store of tree & relational data


## Example

### Let the code speak for me:

```js
const treeStore = require('sqlite-tree-store')
const tree = treeStore('mydb.db', 'system', true) 
```

'mydb.db' - if not exisis, file will be created in current directory
'system' - is a common name for tables:	[system_nodes], [system_values]
and a view [system_recursive] if not exisis, will be created
true - is a forceArrays(exerimental) param (default = false) for storing and reading arrays 

```js
const t = tree()
```
function tree() - actually has two params: (rootId, depth)
so
  tree(0, 1) - will build only first level nodes from root
  tree() - build whole tree deep


### Play with command line (CLI)

In module folder type 
`\> node cli mydb.db system`
and feel free to do some tests, shown below, manually by copy&paste

All CRUD operations performs through JS operations with objects & arrays:

```js
t.config = { 
    mail: { host: 'exchange.myoffice.com', port: 25 }, 
    ssl: { certFile:'main.pfx' }
}
```
now press `ctrl+D` to exit program
next run you can use this config because it auto-saved in database
once again
`\> node cli mydb.db system`
and type 
`\> t`
you will see saved config
```js
{
  config: {
    mail: { host: 'exchange.myoffice.com', port: 25 },
    ssl: { certFile: 'main.pfx' }
  }
}
```
now you can change/add/delete any node or value
type
`t.config.mail.port = 2525`

in some cases you need disable this auto-save-db feature:
`t.config.mail._.port = 10025`
sign `._`  semantically means "break binding to the database"
check actual value by typing
`t.config.mail.port`
```js
\>t.config.mail.port
10025
```
restart program (`ctrl+D`) and check actual value
`t.config.mail.port`

in some cases you need to know real db node id (rowid)
sign `._`  - also opens acces to node meta-data
```js
config.mail._.port.id
```

# license

MIT