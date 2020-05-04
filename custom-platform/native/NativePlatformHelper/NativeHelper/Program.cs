using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Fin = Openfin.Desktop;
using NativeHelper.DTO;

namespace NativeHelper
{
    class Program
    {
        public static void Main(string[] args)
        {
            if(args.Length == 0)
            {
                return;
            }

            NativeMethods.SetProcessDpiAwareness(NativeMethods.ProcessDPIAwareness.ProcessPerMonitorDPIAware);

            var layoutEngine = new LayoutEngine();
            
            var opts = new Fin.RuntimeOptions()
            {
                Version = args[0],
                RuntimeConnectOptions = Fin.RuntimeConnectOptions.NonPersistent
            };

            var runtime = Fin.Runtime.GetRuntimeInstance(opts);

            runtime.Connect(() =>
            {
                Console.WriteLine("Connected to OpenFin");

                var provider = runtime.InterApplicationBus.Channel.CreateProvider("native-platform-helper");

                provider.RegisterTopic<Snapshot, Snapshot>("getSnapshotEx", (snapshot) =>
                {
                    return layoutEngine.ProcessGetSnapshot(snapshot);
                });

                provider.RegisterTopic<Snapshot, object>("applySnapshotEx", (snapshot) =>
                {
                    layoutEngine.ProcessApplySnapshot(snapshot);
                    return null;
                });

                provider.RegisterTopic<DragEventArgs, object>("dragStart", (e) =>
                {
                    layoutEngine.ProcessDragStart(e);
                    return null;
                });

                provider.RegisterTopic<DragEventArgs, object>("dragEnd", (e) =>
                {
                    layoutEngine.ProcessDragEnd();
                    return null;
                });

                provider.OpenAsync();
            });
            
            var runtimeConnectedTsc = new TaskCompletionSource<object>();
            runtime.Disconnected += (s, e) => runtimeConnectedTsc.SetResult(null);
            runtimeConnectedTsc.Task.Wait();
        }
    }

}
