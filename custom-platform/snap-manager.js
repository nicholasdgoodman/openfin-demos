export class SnapManager {
    constructor(opts) {
        Object.assign(this, {
            margin: 4,
            range: 16,
            sensitivity: 4,
            inRange: () => {},
            outOfRange: () => {}
        }, opts);

        this.engine = undefined;
        this.dockedPosition = undefined;
        this.dockCount = 0;
        this.isInRange = false;
    }

    beginDrag(bounds, targetBounds) {
        this.engine = new SimpleDockingEngine(bounds, targetBounds);
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

    endDrag(bounds) {
        if(this.dockedPosition && this.dockCount >= this.sensitivity) {
            this.onDock(this.dockedPosition);
        }

        this.dockCount = 0;
        this.dockedPosition = undefined;
        this.engine = undefined;
    }
}

// borrowed from another project
class SimpleDockingEngine {
    constructor(source, targets) {
        this.snapRange = 32;
        this.snapMargin = 0.60;

        this.snapMap = [];

        targets.forEach(target => {
            this.snapMap.push({
                type: 'top',
                target,
                zone: this.getTopDockZone(source, target),
                position: this.getTopDockPosition(source, target)
            });
            this.snapMap.push({
                type: 'bottom',
                target,
                zone: this.getBottomDockZone(source, target),
                position: this.getBottomDockPosition(source, target)
            });
            this.snapMap.push({
                type: 'right',
                target,
                zone: this.getRightDockZone(source, target),
                position: this.getRightDockPosition(source, target)
            });
            this.snapMap.push({
                type: 'left',
                target,
                zone: this.getLeftDockZone(source, target),
                position: this.getLeftDockPosition(source, target)
            });
        });
    }

    getTopDockZone(source, target) {
        return {
            top: target.top - source.height - this.snapRange,
            left: target.left + this.snapMargin * target.width - source.width,
            height: 2 * this.snapRange,
            width: target.width + source.width - 2 * target.width * this.snapMargin
        };
    }

    getBottomDockZone(source, target) {
        return {
            top: (target.top + target.height) - this.snapRange,
            left: target.left + this.snapMargin * target.width - source.width,
            height: 2 * this.snapRange,
            width: target.width + source.width - 2 * target.width * this.snapMargin
        };
    }

    getLeftDockZone(source, target) {
        return {
            top: target.top + this.snapMargin * target.height - source.height,
            left: target.left - source.width - this.snapRange,
            height: target.height + source.height - 2 * target.height * this.snapMargin,
            width: 2 * this.snapRange
        };
    }

    getRightDockZone(source, target) {
        return {
            top: target.top + this.snapMargin * target.height - source.height,
            left: (target.left + target.width) - this.snapRange,
            height: target.height + source.height - 2 * target.height * this.snapMargin,
            width: 2 * this.snapRange
        };
    }

    getTopDockPosition(source, target) {
        return {
            top: target.top - source.height -1,
            left: target.left,
            height: source.height,
            width: target.width
        };
    }

    getBottomDockPosition(source, target) {
        return {
            top: target.top + target.height + 1,
            left: target.left,
            height: source.height,
            width: target.width
        };
    }

    getLeftDockPosition(source, target) {
        return {
            top: target.top,
            left: target.left - source.width -1,
            height: target.height,
            width: source.width
        };
    }

    getRightDockPosition(source, target) {
        return {
            top: target.top,
            left: target.left + target.width + 1,
            height: target.height,
            width: source.width
        };
    }

    findDockedPosition(bounds) {
        let mapEntry = this.snapMap.find(snap => {
            return (bounds.top > snap.zone.top && bounds.top < (snap.zone.top + snap.zone.height) &&
                bounds.left > snap.zone.left && bounds.left < (snap.zone.left + snap.zone.width));
        });

        return mapEntry;
    }
}