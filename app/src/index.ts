import { Elysia, t } from "elysia";

const app = new Elysia()
  .post("/", 
    () => "Hello Elysia", 
    { 
      body: t.Form({ 
        type: t.UnionEnum(['url', 'article', 'file']), 
        content: t.Union([t.String({ format: 'uri' }), t.String({ minLength: 500 }), t.File({ type: 'application/pdf', maxSize: '5m' })]) 
      }) 
    })
    .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);