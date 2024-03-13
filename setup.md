### SETUP OF THIS PROJECT API (Typscript + Node + MongoDB)

- [ ] Installed body-parser, cookie-parser, dotenv, joi and other nesscessary packages.

* [ ] I wanted to support ES6 Modules by default to i set the **"type": "module"** option in package.json
* [ ] To use typescript i used **yarn add -D typescript @types/express @types/node,** and generated a **_tsconfig.json_** using **npx tsc --init**
* [ ] I installed ts-node, directly execute ts files.
* [ ] Had a few issues but resolved everything by setting target & **module** to **ES2022**, then setting the moduleResolution to **Node10**, in the tsconfig.
* [ ] To run ts-node i used the --esm flag on the command to instruct it to treat all .ts files as an es module

  `ts-node --esm index.ts`

> The reason it worked is that the **`--esm`** option tells **`ts-node`** to treat the TypeScript file as an **ECMAScript module (ESM)** . This allows Node.js to recognize the `.ts` extension correctly and execute your TypeScript code seamlessly.

Then i used the

- [ ] Finally then run ts-node with nodemon, i had to configure the dev command a bit differently, to monitor changes in the file, but to execute the ts-node to transpile it first by using this --exec flag:
      `"scripts": { "dev": "nodemon --exec ts-node --esm ./index.ts" },`

More Configurations:
