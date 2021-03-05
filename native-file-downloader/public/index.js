
import { saveFile, saveAndOpenFile, openFile, isError, getErrorMessage, init as helperInit } from './file-helper.js';

let fileName = 'export.csv';
let delayedFileName = 'export2.csv';
let fileId;

let blob = new Blob([[
    '"A","B","C"',
    '"1","2","3"',
    '"4","5","6"',
].join('\n')], { type: 'text/csv'});

async function init() {
    await helperInit();
    let saveButton = document.getElementById("save");
    let openButton = document.getElementById("open");
    let delayedButton = document.getElementById("delayed");  
    saveButton.onclick = async ()=> {
        await save();
    };

    openButton.onclick = async ()=> {
        let result = await openFile(fileId);
        if(isError(result)) {
            console.error(getErrorMessage(result));
        }
    };

    delayedButton.onclick = async ()=> {
        await delayedOpen();
    };

    saveButton.style.display = "unset";
    openButton.style.display = "unset";
    delayedButton.style.display = "unset";
}

async function delayedOpen() {
    let reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async function() {
            let dataUrl = reader.result;
            let data = dataUrl.substr(dataUrl.indexOf(',') + 1);
            console.log(data);
            setTimeout(async ()=> {
                let result = await saveAndOpenFile(delayedFileName, data);
                if(isError(result)) {
                    console.error(getErrorMessage(result));
                }
            }, 5000);
        };
}

async function save() {
    let reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async function() {
        let dataUrl = reader.result;
        let data = dataUrl.substr(dataUrl.indexOf(',') + 1);
        console.log(data);
        fileId = await saveFile(fileName, data);
        if(isError(fileId)) {
            console.error(getErrorMessage(fileId));
        }
    };
}

init();