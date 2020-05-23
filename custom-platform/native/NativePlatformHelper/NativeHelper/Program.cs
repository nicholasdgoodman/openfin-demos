using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Fin = Openfin.Desktop;
using NativeHelper.DTO;
using Newtonsoft.Json.Linq;
using System.Runtime.InteropServices;
using Openfin.Desktop;

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

        void UpdateOptionsRaw(this Window window, object options, AckCallback ack, AckCallback nak)
        {
            var app = window.Application;
            var runtime = app.Runtime;

            var payload = new JObject();
            payload["uuid"] = app.Uuid;
            payload["name"] = window.Name;
            payload["options"] = JObject.FromObject(options);

            runtime.DesktopConnection.sendAction("update-window-options", payload, ack, nak);
        }

        void EnableMaximize(IntPtr handle)
        {
            var style = NativeMethods.GetWindowLong(handle, NativeMethods.WindowLongParam.GWL_STYLE);
            style |= (uint)(NativeMethods.WindowStyles.WS_MAXIMIZE);
            NativeMethods.SetWindowLong(handle, NativeMethods.WindowLongParam.GWL_STYLE, style);
        }

        void DisableMaximize(IntPtr handle)
        {
            var style = NativeMethods.GetWindowLong(handle, NativeMethods.WindowLongParam.GWL_STYLE);
            style &= ~(uint)(NativeMethods.WindowStyles.WS_MAXIMIZE);
            NativeMethods.SetWindowLong(handle, NativeMethods.WindowLongParam.GWL_STYLE, style);
        }
    }

}
