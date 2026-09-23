console.log("Debug boot starting...");
import('./server.ts').then(() => {
    console.log("Debug boot imported server.ts");
}).catch(console.error);
