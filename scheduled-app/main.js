(async function() {
    console.log('Scheduled App!');

    const imageUrl = "http://cdn.openfin.co/assets/testing/icons/circled-digit-one.png";

    const app = fin.Application.getCurrentSync();
    const win = fin.Window.getCurrentSync();

    win.addListener('close-requested', () => win.hide());
    app.addListener('run-requested', () => showApp());

    app.setTrayIcon(imageUrl);
    app.addListener('tray-icon-clicked', () => showApp());

    setInterval(() => {
        let now = new Date();
        let min = now.getMinutes();
        let sec = now.getSeconds();
        if(sec < 2 && min % 3 === 0) {
            showApp();
        }
    }, 1000);

    function showApp() {
        win.show();
        win.setAsForeground();
    }

    document.querySelector('#close-button').addEventListener('click', () => win.close(false));
    document.querySelector('#quit-button').addEventListener('click', () => win.close(true));
})();