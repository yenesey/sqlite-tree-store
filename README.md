# SQLite Tree Store
## A simple document store over SQLite
This module is suitable when you need:
- a simple schema-less store for quick prototyping (like "mongo on minimals")
- to store config data in SQLite instead of .json files
- combined store of document (tree) & relational data models


## Example
```js
const treeStore = require('sqlite-tree-store')
const tree = treeStore('mydb.db', 'system', true)
const t = tree() // -- restore tree from db (or create empty one)
```
Explain treeStore params:

'mydb.db' - if not exisis, file will be created in current directory

'system' - is a common name for tables: [system_nodes], [system_values] and a view [system_recursive]. Existance of tables checked at every startup.

true - is a forceArrays (exerimental) param (default = false) for storing and reading arrays 

**function tree()** - actually has [optional] params: (rootId, depth)

so

**tree(0, 1)** - will build only first level nodes from root (root always is zero)
  
**tree()** - build whole tree deep


### Play with command line (CLI)

In module folder type 
```js
\> node cli mydb.db system
```
and feel free to do some tests, shown below, manually by copy&paste

All CRUD operations performed through JavaScript ones with objects & arrays:

```js
\> t.config = { 
    mail: { host: 'exchange.myoffice.com', port: 25 }, 
    ssl: { certFile:'main.pfx' }
}
```
now press `ctrl+D` to exit program

next run you can use this config because it **auto-saved in database**

once again:
```js
\> node cli mydb.db system
```
and type 
```js
\> t
```
you will see saved config
```js
{
  config: {
    mail: { host: 'exchange.myoffice.com', port: 25 },
    ssl: { certFile: 'main.pfx' }
  }
}
```
now you can add, modify, delete any node or value of `t`

in some cases you'll need to disable this **auto-db-save** feature:

type
```js
\> t.config.mail._.port = 10025
```
sign `._`  semantically means "break binding to the database"

check actual node value by typing `t.config.mail.port`
```js
\> t.config.mail.port
10025
```
restart program (`ctrl+D`) and check actual **saved** value

if all done right, port = 10025 is not saved
```js
\> t.config.mail.port
25
```

in some cases you need to know real db node id (rowid)

sign `._`  - also opens acces to node meta-data:
```js
\> config.mail._.port.id
4
```

# license

MIT
