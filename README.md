# Sqlite Tree Store
## A simple document store over SQLite
This Node.js module is suitable in several cases:
- simple handy schema-less store for quick prototyping
- store config data instead of .json files
   
## Usage examples
```
const treeStore = require('sqlite-tree-store')
const tree = treeStore('mydb.db', 'system', true)
// <system> - is a common name for tables 
// <system_nodes>, <system_values> and view <system_recursive>
const sys = tree()

sys.config = { mail: { host: 'exchange.myoffice.com', port: 25 } }
```
next run you can use this config cause it already saved in database
```

```
because 

###
- nodejs (https://nodejs.org/)

