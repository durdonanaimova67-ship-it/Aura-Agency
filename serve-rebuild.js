const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'rebuild');
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html';
  fs.readFile(path.join(ROOT,p),(e,d)=>{ if(e){res.writeHead(404);res.end('404');return;}
    const ext=path.extname(p); const t=ext==='.html'?'text/html':'text/plain';
    res.writeHead(200,{'Content-Type':t});res.end(d);});
}).listen(8081,()=>console.log('rebuild at http://localhost:8081/'));
