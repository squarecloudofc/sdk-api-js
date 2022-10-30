# **Installation** | Instalação

```bash
$ npm install @squarecloud/api
```

# **Getting your API Key** | Adquirindo sua chave da API

The **first** thing you have to do is to get your API key.

1. Open the [**SquareCloud Dashboard**](https://squarecloud.app/dashboard/me).
2. Login with your Discord account.
3. Go to `My Account`.
4. And finally click `Regenerate API/CLI Key`.


# **Setting Up** | Configurando

Creating an API instance:

```js
import { SquareCloudAPI } from '@squarecloud/api' // JavaScript: const { SquareCloudAPI } = require('@squarecloud/api')

const api = new SquareCloudAPI('Your API Key')
```

## **Getting user's informations** | Adquirindo informações de usuários

```js
// If the ID is not provided it will get your own informations
const user = await api.getUser('User Discord ID')

// To get private properties you have to check if you have access:
if (user.hasAccess()) {
  console.log(user.applications)
}
```

## **Using Applications** | Usando aplicações

There are two ways for getting applications.

### **First**

```js
const user = await api.getUser()

// Through the array from the user (Only available if you have access to it)
const application = user.applications[0]
```

### **Second**

```js
// Using the Application ID
const application = await api.getApplication('ID')
```

## **Getting Applications Information** | Adquirindo info de aplicações

### **Status**

```js
const application = await api.getApplication('ID')

// Returns a bunch of info about the current status of the app
application.getStatus()
```

### **Logs**

```js
const application = await api.getApplication('ID')

// If `true` it will get the full logs url
// If `false` or blank it will get only the recent logs string
application.getLogs(true)
```

## **Managing Applications** | Gerenciando aplicações

### **Start, Stop & Restart**

```js
const application = await api.getApplication('ID')

// Every single method will return `true` if it is successfuly executed

application.start()

application.stop()

application.restart()
```

### **Backup**

```js
const application = await api.getApplication('ID')

// Generates a backup and returns its download url
application.backup()
```

### **Delete**

```js
const application = await api.getApplication('ID')

// Deletes your whole application
application.delete()
```

### **Commit**

```js
import path from 'path' // JavaScript: const path = require('path')

const application = await api.getApplication('ID')

// Commits a file change to your application
// You must use the absolute file path with the file extension
application.commit(path.join(__dirname, 'index.js'))

// You can use Buffers too:
application.commit(<Buffer>, 'index', '.js')
```
