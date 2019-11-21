# SQLite Tree Store
## A simple document store over SQLite
This Node.js module is suitable in several cases:
- simple handy schema-less store for quick prototyping
- store config data instead of .json files
   
## Usage
### Let's some code speaking:
```javascript
const treeStore = require('sqlite-tree-store')
const tree = treeStore('mydb.db', 'system', true) // <system> - is a common name for tables:
// <system_nodes>, <system_values> and a view <system_recursive>
const sys = tree()

sys.config = { 
    mail: { 
        host: 'exchange.myoffice.com', 
        port: 25 
    }, 
    ssl: {
        certFile:'main.pfx'
    }
}
// next run you can use this config because it auto-saved in database
const config = sys.config
// all further changes auto-saved too:
config.mail.port = 2525 // -- autosaved!

// in some cases you don't need auto-save data in db:
config.ssl.sertData = fs.readFileSync(config.ssl.certFile) // -- you don't need store whole file in db

// so, use this
config.ssl._.sertData = fs.readFileSync(config.ssl.certFile)
//  ._.  semantically means "break binding to the database"
// but <config.ssl.sertData> received whole file contents

// in some cases you need to know real db node id (rowid)
// ._.  - also opens acces to node meta-data
config.mail._.port.id   //  -> rowid of <port>
````
