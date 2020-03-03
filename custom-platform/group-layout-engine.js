export class GroupLayoutEngine {
    _layoutResolver;
    _log;
    _lastBounds;
    _isInitialised = false;
    _platformWindow;
    _webWindow;
    _id;
    _groupOptions;
    _isInGroup = false;
    _onGroupStatusChanged;
  
    constructor(platformWindow, layoutResolver, log, options = {}) {
      if (log !== undefined) {
        this._log = message => {
          log("GLE:" + this._id + ":" + message);
        };
      } else {
        this._log = message => {
          console.log("GLE:" + this._id + ":" + message);
        };
      }
  
      this._groupOptions = Object.assign({
        joinGroup: {
          maximizable: false,
          resizeRegion: {
            size: 0,
            bottomRightCorner: 0
          }
        },
        leaveGroup: {
          maximizable: true,
          resizeRegion: {
            size: 7,
            bottomRightCorner: 9
          }
        }
      }, options);
  
      this.browserWindowResize = this.browserWindowResize.bind(this);
      this.init = this.init.bind(this);
      this.addListeners = this.addListeners.bind(this);
      this.groupChanged = this.groupChanged.bind(this);
      this.isInGroup = this.isInGroup.bind(this);
      this.isNotInGroup = this.isNotInGroup.bind(this);
      this.checkLayout = this.checkLayout.bind(this);

      if (platformWindow === undefined) {
        throw new Error("You must pass a native Openfin Window");
      }

      if(layoutResolver === undefined) {
        throw new Error("You must specify a layout resolver");
      }

      this._id = platformWindow.me.name;
      this._layoutResolver = layoutResolver;
      this._platformWindow = platformWindow;
      this._webWindow = platformWindow.getWebWindow() ?? window;
      this._log("Constructed an instance of the group layout engine");
    }

    get browserWindow() {
      if(this._webWindow !== undefined) {
        return this._webWindow;
      }
      return this._platformWindow.getWebWindow();
    }
  
    async init(onGroupStatusChange) {
      if (this._isInitialised) {
        this._log(
          "This instance of the group layout engine is already initialised."
        );
        return;
      }
      this._isInitialised = true;
      
      this._onGroupStatusChanged = onGroupStatusChange;
      
      this._lastBounds = await this._platformWindow.getBounds();
      
      this.addListeners(this._platformWindow);

      let options = await this._platformWindow.getOptions();
      let isInGroup = options.customData !== undefined && options.customData.isInGroup === true;
      
      if(isInGroup || await this._platformWindow.getGroup().length > 0) {
        this._log("Already in a group. Setting up listeners.");
         await this.isInGroup();
      }

      this._platformWindow.on('close-requested', async () => {
        await this.removeListeners();

        this._platformWindow.close(true);
      });

      this._log("Initialised");
    }
  
    async addListeners(platformWindow) {
      await platformWindow.addListener(
        "group-changed",
        this.groupChanged.bind(this)
      );
    }

    async removeListeners() {
      if(this._isInGroup) {
        this.browserWindow.removeEventListener(
          "resize",
          this.browserWindowResize
        );
      }
      
      await this._platformWindow.removeListener(
        "group-changed",
        this.groupChanged.bind(this)
      );
    }
  
    async browserWindowResize() {
      // this gets triggered when a window is grouped. Bounds Changed doesn't fire
      // if moveIndependently: true is specified when resizing. And we want that as we want to have custom
      // resolver logic
      await this.checkLayout();
    }
  
    async groupChanged(event) {
      if (event.reason === "join" && !this._isInGroup) {
        this._log(
          "This window is joining a group. Locking manual resize and listening to browser window resize events."
        );
  
        await this.isInGroup();
      } else if (this._isInGroup && event.reason === "leave" && 
      (event.targetWindowName === this._id || (event.sourceGroup.length === 1 && event.sourceGroup[0].windowName  === this._id))) {
        this._log(
          "This window is leaving a group. Restoring manual resize and removeing listener for browser resize events."
        );
       await this.isNotInGroup();
      }
    }

    async isInGroup(){
      this._isInGroup = true;
      this.browserWindow.addEventListener("resize", this.browserWindowResize);
      
      await this._platformWindow.updateOptions(Object.assign({customData: { isInGroup: true }}, this._groupOptions.joinGroup));

      if(this._onGroupStatusChanged !== undefined) {
        this._onGroupStatusChanged(true);
      }
    }

    async isNotInGroup(){
      this._isInGroup = false;
      this.browserWindow.removeEventListener(
        "resize",
        this.browserWindowResize
      );
      await this._platformWindow.updateOptions(Object.assign({customData: { isInGroup: false }}, this._groupOptions.leaveGroup));
      if(this._onGroupStatusChanged !== undefined) {
        this._onGroupStatusChanged(false);
      }
    }
  
    async checkLayout() {
      if (this._layoutResolver === undefined) {
        throw new Error("You need to specify a group layout resolver for the group layout engine.");
      }
      let group = await this._platformWindow.getGroup();
      if (group.length > 0) {
        let newBounds = await this._platformWindow.getBounds();
        let group = await this._platformWindow.getGroup();
        let height = 0;
        let width = 0;
        let isHeightIncreasing;
        let isWidthIncreasing;
        if (newBounds.height > this._lastBounds.height) {
          height = newBounds.height - this._lastBounds.height;
          isHeightIncreasing = true;
        } else {
          height = this._lastBounds.height - newBounds.height;
          isHeightIncreasing = false;
        }
        if (newBounds.width > this._lastBounds.width) {
          width = newBounds.width - this._lastBounds.width;
          isWidthIncreasing = true;
        } else {
          width = this._lastBounds.width - newBounds.width;
          isWidthIncreasing = false;
        }
        let change = {
          height,
          width,
          isHeightIncreasing,
          isWidthIncreasing,
          newBounds
        };
        this._lastBounds = newBounds;
        await this._layoutResolver.resolve(this._platformWindow, group, change);
      }
    }
  }
  