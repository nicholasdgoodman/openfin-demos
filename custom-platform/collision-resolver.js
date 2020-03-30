export class CollisionResolver {
    constructor(hasOverlap, hasGap, log) {
      if (log !== undefined) {
        this._log = log;
      } else {
        this._log = console.log;
      }
  
      this._log("LayoutResolver");
  
      if (hasOverlap !== undefined) {
        this.hasOverlap = hasOverlap.bind(this);
      }
  
      if (hasGap !== undefined) {
        this.hasGap = hasGap.bind(this);
      }
    }
  
    async resolve(triggerWindow, groupedWindows, change) {
      console.log('resolve', [...arguments]);
      let windowsToMove = [];
      let windowsNotMoving = [];
      if (change.width !== 0) {
        this._log("Horizontal sizing currently not supported.");
        return;
      }
      for (let i = 0; i < groupedWindows.length; i++) {
        let windowInGroup = groupedWindows[i];
        let groupBounds = await windowInGroup.getBounds();
  
        if (windowInGroup.identity.name !== triggerWindow.identity.name) {
          let impact = change.isHeightIncreasing
            ? this.hasOverlap(change.newBounds, groupBounds)
            : this.hasGap(change.newBounds, groupBounds, change.height);
  
          if (impact) {
            this._log(
              "Group Window ID: " +
                windowInGroup.identity.name +
                " impacted by original window name: " +
                triggerWindow.identity.name +
                " orginal window is increasing in height: " +
                change.isHeightIncreasing +
                " height change: " +
                change.isHeightIncreasing
                ? change.height
                : -Math.abs(change.height)
            );
            if (!change.isHeightIncreasing) {
              this._log(
                "Validating whether window: " +
                  windowInGroup.identity.name +
                  " can be moved up without overlapping any other windows."
              );
            }
            windowsToMove.push({
              windowToMove: windowInGroup,
              bounds: groupBounds
            });
          } else {
            windowsNotMoving.push({
              windowNotMoving: windowInGroup,
              bounds: groupBounds
            });
          }
        }
      }
  
      this._log(
        "Number of windows impacted by window resize: " + windowsToMove.length
      );
      this._log(
        "Number of windows not impacted by window resize: " +
          windowsNotMoving.length
      );
      if (windowsToMove.length > 0) {
        let finalListOfWindowsToMove = [];
  
        if (change.isHeightIncreasing) {
          finalListOfWindowsToMove = windowsToMove.map(
            entry => entry.windowToMove
          );
        } else {
          for (let j = 0; j < windowsToMove.length; j++) {
            let updatedBounds = windowsToMove[j].bounds;
            updatedBounds.top -= change.height;
            let overlaps = this.checkMultipleForOverlap(
              updatedBounds,
              windowsNotMoving
            );
            if (!overlaps) {
              finalListOfWindowsToMove.push(windowsToMove[j].windowToMove);
            }
          }
        }
  
        for (let w = 0; w < finalListOfWindowsToMove.length; w++) {
          let windowToMove = finalListOfWindowsToMove[w];
          await windowToMove.moveBy(
            0,
            change.isHeightIncreasing ? change.height : -Math.abs(change.height),
            {
              moveIndependently: true
            }
          );
         
          await this.determineOverlapOrGap(
            windowToMove,
            groupedWindows,
            change.isHeightIncreasing,
            change.height
          );
        }
      }
    }
  
    async determineOverlapOrGap(
      movedWindow,
      group,
      isGrowing,
      heightChange = 0,
      widthChange = 0
    ) {
      let newBounds = await movedWindow.getBounds();
      let windowsToRegroup = [];
      if (heightChange !== 0 && widthChange !== 0) {
        // resizing height and width
      } else if (heightChange !== 0) {
        let moveTopBy = heightChange;
        //let alternateMove;
  
        for (let i = 0; i < group.length; i++) {
          let windowInGroup = group[i];
          let groupBounds = await windowInGroup.getBounds();
          if (windowInGroup.identity.name !== movedWindow.identity.name) {
            let hasOverlap = this.hasOverlap(newBounds, groupBounds);
            let hasGap = this.hasGap(newBounds, groupBounds, moveTopBy);
            let impact;
            if (isGrowing) {
              impact = hasOverlap;
              //let newCeiling = newBounds.top + newBounds.height;
              //alternateMove = newCeiling.top - groupBounds.top + 1;
            } else {
              // if (hasOverlap) {
              //   impact = hasOverlap;
              //   isGrowing = true;
              // } else {
              impact = hasGap;
            }
            // }
            // let impact = isGrowing
            //   ? hasOverlap
            //   : hasGap;
            if (impact) {
              windowsToRegroup.push(windowInGroup);
              await windowInGroup.moveBy(
                0,
                isGrowing ? moveTopBy : -Math.abs(moveTopBy),
                {
                  moveIndependently: true
                }
              );
            }
          }
        }
  
        // if (windowsToRegroup.length > 0) {
        //   this._log(
        //     "About to call determineOverlapOrGap from determineOverlapOrGap."
        //   );
        //   for (let w = 0; w < windowsToRegroup.length; w++) {
        //     await this.determineOverlapOrGap(
        //       windowsToRegroup[w],
        //       group,
        //       isGrowing,
        //       moveTopBy
        //     );
        //   }
        // }
      }
    }
  
    checkMultipleForOverlap(bounds, groupOfWindows) {
      let finalResult = false;
      for (let i = 0; i < groupOfWindows.length; i++) {
        let overlaps = this.hasOverlap(bounds, groupOfWindows[i].bounds);
        if (overlaps) {
          finalResult = true;
          break;
        }
      }
      return finalResult;
    }
  
    hasGap(bounds1, bounds2, heightReduction = 0, widthReduction = 0) {
      let gutter = 10;
      let verticalGutterHeight = heightReduction > 0 ? gutter + 2 : 0;
      let horizontalGutterLength = widthReduction > 0 ? gutter + 2 : 0;
  
      var d1_height = bounds1.height;
      var d1_width = bounds1.width;
      var d1_distance_from_top = bounds1.top + d1_height;
      var d1_distance_from_left = bounds1.left + d1_width;
  
      var d2_height = bounds2.height;
      var d2_width = bounds2.width;
      var d2_distance_from_top = bounds2.top + d2_height;
      var d2_distance_from_left = bounds2.left + d2_width;
  
      var bounds2AdjustedTop =
        bounds2.top - (heightReduction + verticalGutterHeight);
      var bounds2FullHeightAdjustedTop = bounds2AdjustedTop + d2_height;
  
      var bounds2AdjustedLeft =
        bounds2.left - (widthReduction + horizontalGutterLength);
      var bounds2FullWidthAdjustedLeft = bounds2AdjustedLeft + d2_width;
  
      // &&d1_distance_from_top >= bounds2AdjustedTop;
      var gapWouldHaveBeenCreated =
        ((bounds1.top <= bounds2AdjustedTop &&
          bounds2AdjustedTop <= d1_distance_from_top) ||
          (bounds1.top >= bounds2AdjustedTop &&
            bounds1.top <= bounds2FullHeightAdjustedTop)) &&
        ((bounds1.left <= bounds2AdjustedLeft &&
          bounds2AdjustedLeft <= d1_distance_from_left) ||
          (bounds1.left >= bounds2AdjustedLeft &&
            bounds1.left <= bounds2FullWidthAdjustedLeft));
  
      return gapWouldHaveBeenCreated;
      // Return whether it IS colliding
      //return !not_colliding;
    }
  
    hasOverlap(bounds1, bounds2) {
      var d1_height = bounds1.height;
      var d1_width = bounds1.width;
      var d1_distance_from_top = bounds1.top + d1_height;
      var d1_distance_from_left = bounds1.left + d1_width;
  
      var d2_height = bounds2.height;
      var d2_width = bounds2.width;
      var d2_distance_from_top = bounds2.top + d2_height;
      var d2_distance_from_left = bounds2.left + d2_width;
  
      var not_colliding =
        d1_distance_from_top <= bounds2.top ||
        bounds1.top >= d2_distance_from_top ||
        d1_distance_from_left <= bounds2.left ||
        bounds1.left >= d2_distance_from_left;
  
      // Return whether it IS colliding
      return !not_colliding;
    }
  }
  