if(window.fin) {
    console.log('OpenFin Behaviors!')

    // Callbacks referenced app.py
    window.dash_clientside = Object.assign({}, window.dash_clientside, {
        openfin: {
            updateInput: function(value) {
                fin.InterApplicationBus.publish('update-input', {
                    value,
                    selector: '#page-2-input'  // Hard coded for now...
                });

                return value;
            }
        }
    });

    // This subscription happens on every page load in this app:
    fin.InterApplicationBus.subscribe({ uuid: fin.me.uuid }, 'update-input', evt => {
        let { selector, value } = evt;

        let element = document.querySelector(selector);

        if(!element)
            return;

        let elPrototype = Object.getPrototypeOf(element);
        let protoValueSet = Object.getOwnPropertyDescriptor(elPrototype, 'value').set;

        protoValueSet.call(element, value);

        element.dispatchEvent(new Event('input', { bubbles: true }));
    });
}