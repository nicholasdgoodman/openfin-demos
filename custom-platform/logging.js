
let loggerObj = { };
const logHandler = {
    get: function(obj, prop) {
        return prop in loggerObj ? loggerObj[prop] : () => {};
    }
} 

let loggerProxy = new Proxy(loggerObj, logHandler);

export function setLogger(logger) {
    loggerObj = logger;
}

export function getLogger() {
    return loggerProxy;
}