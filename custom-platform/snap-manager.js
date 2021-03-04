import { getPlatform } from './platform.js';

export class SnapManager {
    constructor(opts) {
        Object.assign(this, {
            margin: 4,
            range: 16,
            sensitivity: 4,
            snapPeriod: 200,
            inRange: () => {},
            outOfRange: () => {}
        }, opts);

        this.engine = undefined;
        this.draggingWindow = undefined;
        this.dockedPosition = undefined;
        this.dockCount = 0;
        this.isInRange = false;

        //TODO: this interval is never cleared - results in a leak
        setInterval(async() => {
            if(this.draggingWindow) {
                let bounds = await this.draggingWindow.getBounds();
                this.drag(bounds);
            }
        }, this.snapPeriod);
    }

    async beginDrag(source) {
        let platform = await getPlatform();

        let { uuid, name } = source;
        let { windows } = await platform.getSnapshot();
    
        let sourceWin = windows.find(win => win.name === name);
        let targetWins = windows.filter(win => win.name !== name && win.state === 'normal');
    
        if(sourceWin && targetWins.some(win => win.customData && win.customData.groupId === sourceWin.customData.groupId)) {
            return;
        }
    
        this.engine = new SimpleSnapEngine(source, targetWins);
    
        this.draggingWindow = Object.assign(
            fin.Window.wrapSync({ uuid, name }), { options: sourceWin }
        );
    }

    drag(bounds) {
        if(!this.engine) {
            return;
        }

        let newDockedPosition = this.engine.findDockedPosition(bounds);

        // Debounce logic
        if(newDockedPosition && newDockedPosition === this.dockedPosition) {
            this.dockCount++;

            if(this.dockCount >= this.sensitivity && !this.isInRange) {
                this.isInRange = true;
                this.inRange(this.dockedPosition);
            }
        }
        else {
            this.dockedPosition = newDockedPosition;
            this.dockCount = 0;

            if(this.isInRange) {
                this.isInRange = false;
                this.outOfRange();
            }
        }
    }

    endDrag(source) {
        if(this.dockedPosition && this.dockCount >= this.sensitivity) {
            this.onSnap(this.dockedPosition);
        }

        this.dockCount = 0;
        this.dockedPosition = undefined;
        this.engine = undefined;
        this.draggingWindow = undefined;
    }
}

// borrowed from another project
class SimpleSnapEngine {
    constructor(source, targets) {
        this.snapRange = 32;
        this.snapMargin = 0.60;

        this.snapMap = [];

        let snapKinds = [ 'top', 'bottom', 'left', 'right' ];

        targets.forEach(target => snapKinds.forEach(kind => {
            if(target.visibleEdges === undefined || target.visibleEdges[kind]) {
                this.snapMap.push({
                    type: kind,
                    source,
                    target,
                    zone: this.getDockZone(source, target, kind),
                    position: this.getDockPosition(source, target, kind)
                });
            }
        }));
    }

    getDockZone(source, target, kind) {
        let zones = {
            top: {
                top: target.top - source.height - this.snapRange,
                left: target.left + this.snapMargin * target.width - source.width,
                height: 2 * this.snapRange,
                width: target.width + source.width - 2 * target.width * this.snapMargin
            },
            bottom: {
                top: (target.top + target.height) - this.snapRange,
                left: target.left + this.snapMargin * target.width - source.width,
                height: 2 * this.snapRange,
                width: target.width + source.width - 2 * target.width * this.snapMargin
            },
            left: {
                top: target.top + this.snapMargin * target.height - source.height,
                left: target.left - source.width - this.snapRange,
                height: target.height + source.height - 2 * target.height * this.snapMargin,
                width: 2 * this.snapRange
            },
            right: {
                top: target.top + this.snapMargin * target.height - source.height,
                left: (target.left + target.width) - this.snapRange,
                height: target.height + source.height - 2 * target.height * this.snapMargin,
                width: 2 * this.snapRange
            }
        }
        
        return zones[kind];
    }

    getDockPosition(source, target, kind) {
        let positions = {
            top: {
                top: target.top - source.height -1,
                left: target.left,
                height: source.height,
                width: target.width
            },
            bottom: {
                top: target.top + target.height + 1,
                left: target.left,
                height: source.height,
                width: target.width
            },
            left: {
                top: target.top,
                left: target.left - source.width -1,
                height: target.height,
                width: source.width
            },
            right: {
                top: target.top,
                left: target.left + target.width + 1,
                height: target.height,
                width: source.width
            }
        };

        return positions[kind];
    }

    findDockedPosition(bounds) {
        let mapEntry = this.snapMap.find(snap => {
            return (bounds.top > snap.zone.top && bounds.top < (snap.zone.top + snap.zone.height) &&
                bounds.left > snap.zone.left && bounds.left < (snap.zone.left + snap.zone.width));
        });

        return mapEntry;
    }
}