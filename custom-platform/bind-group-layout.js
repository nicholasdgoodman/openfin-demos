
const setup = async () => {
  let win;
  // this can be extended to support additional entityTypes
  if (fin.me.entityType === "view") {
    let view = fin.View.getCurrentSync();
    win = await view.getCurrentWindow();
  } else {
    win = fin.Window.getCurrentSync();
  }

  console.log("Before import");
  const engineModule = await import('./group-layout-engine.js');
  const resolverModule = await import('./group-layout-resolver.js');
  console.log("After import");
  // teams can swap in their own layout resolver or group layout engine by switching
  // out the js files or replacing this script and constructing it themselves
  const resolver = new resolverModule.GroupLayoutResolver();
  const layoutEngine = new engineModule.GroupLayoutEngine(
    win, 
    resolver,
    console.log
  );

  await layoutEngine.init();
};

window.addEventListener("DOMContentLoaded", async () => {
  await setup();
});
