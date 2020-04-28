using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Drawing;

using System.Runtime.InteropServices;
using System.Windows;

using Newtonsoft.Json.Linq;
using Fin = Openfin.Desktop;

using Point = System.Drawing.Point;
using Size = System.Drawing.Size;

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

                provider.RegisterTopic<JObject, object>("getSnapshotEx", (snapshot) =>
                {
                    var enumWindowsTsc = new TaskCompletionSource<object>();

                    snapshot["snapshotDetails"]["screens"] = JArray.FromObject(
                        Screen.AllScreens.Select(screen =>
                        {                            
                            return new
                            {
                                rect = new
                                {
                                    top = screen.Bounds.Top,
                                    bottom = screen.Bounds.Bottom,
                                    left = screen.Bounds.Left,
                                    right = screen.Bounds.Right
                                },
                                primary = screen.Primary,
                                name = screen.DeviceName
                            };
                        })
                    );

                    var snapshotWindows = snapshot["windows"] as JArray;

                    foreach (var windowEntry in snapshotWindows)
                    {
                        if(windowEntry.Value<string>("name").StartsWith("@@"))
                        {
                            continue;
                        }

                        var nativeId = windowEntry.Value<string>("nativeId");
                        var handle = new IntPtr(int.Parse(nativeId.Substring(2), System.Globalization.NumberStyles.HexNumber));

                        NativeMethods.RECT rect;
                        NativeMethods.GetWindowRect(handle, out rect);

                        var offset = 8;

                        // Check if the corners are visible as a crude
                        // edge detection system
                        var topLeftHit = HitTest(handle, new Point(rect.left + offset, rect.top + offset));
                        var topRightHit = HitTest(handle, new Point(rect.right - offset, rect.top + offset));
                        var bottomLeftHit = HitTest(handle, new Point(rect.left + offset, rect.bottom - offset));
                        var bottomRightHit = HitTest(handle, new Point(rect.right - offset, rect.bottom - offset));

                        var visibleEdges = new JObject();
                        visibleEdges["top"] = topLeftHit && topRightHit;
                        visibleEdges["bottom"] = bottomLeftHit && bottomRightHit;
                        visibleEdges["left"] = topLeftHit && bottomLeftHit;
                        visibleEdges["right"] = topRightHit && bottomRightHit;

                        // Window Rect will be in unscaled, physical coordinates
                        windowEntry["windowRect"] = JObject.FromObject(rect);
                        windowEntry["visibleEdges"] = visibleEdges;
                    }

                    // Sort the windows by their Z-Order, Highest appears first in list
                    var allWindowsSorted = NativeMethods.EnumWindows(IntPtr.Zero);
                    
                    snapshot["windows"] = new JArray(allWindowsSorted
                        .Select(hWnd => $"0x{(int)hWnd:X8}")
                        .Join(snapshotWindows,
                            nativeId => nativeId,
                            windowEntry => windowEntry.Value<string>("nativeId"),
                            (key, item) => item
                         ));

                    enumWindowsTsc.SetResult(snapshot);

                    return enumWindowsTsc.Task.Result;
                });

                provider.RegisterTopic<JObject, object>("applySnapshotEx", (snapshot) =>
                {
                    var snapshotWindows = snapshot["windows"] as JArray;

                    foreach (var windowEntry in snapshotWindows)
                    {
                        if (windowEntry.Value<string>("name").StartsWith("@@"))
                        {
                            continue;
                        }

                        var nativeId = windowEntry.Value<string>("nativeId");
                        var handle = new IntPtr(int.Parse(nativeId.Substring(2), System.Globalization.NumberStyles.HexNumber));

                        var rect = windowEntry["windowRect"].ToObject<NativeMethods.RECT>();

                        // Re-apply Positioning to fix rounding errors
                        // caused by using scaled coordinates in the Runtime
                        NativeMethods.SetWindowPos(handle, IntPtr.Zero, 
                            rect.left, 
                            rect.top,
                            rect.right - rect.left,
                            rect.bottom - rect.top, 
                            NativeMethods.SetWindowPosFlags.DoNotActivate | NativeMethods.SetWindowPosFlags.IgnoreZOrder);
                    }

                    return null;
                });

                provider.OpenAsync();
            });
            
            var runtimeConnectedTsc = new TaskCompletionSource<object>();
            runtime.Disconnected += (s, e) => runtimeConnectedTsc.SetResult(null);
            runtimeConnectedTsc.Task.Wait();
        }
    
        static bool HitTest(IntPtr target, Point point)
        {
            var window = NativeMethods.WindowFromPoint(point);

            while(window != IntPtr.Zero)
            {
                if(window == target)
                {
                    return true;
                }

                window = NativeMethods.GetParent(window);
            }

            return false;
        }
    }

    partial class NativeMethods
    {
        [DllImport("user32.dll")]
        public static extern IntPtr GetDC(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern int ReleaseDC(IntPtr hWnd, IntPtr hdc);

        [DllImport("gdi32.dll")]
        public static extern int GetClipBox(IntPtr hdc, out RECT lprc);

        [DllImport("user32.dll")]
        public static extern bool PhysicalToLogicalPointForPerMonitorDPI(IntPtr hWnd, ref POINT p);

        [DllImport("user32.dll")]
        public static extern bool LogicalToPhysicalPointForPerMonitorDPI(IntPtr hWnd, ref POINT p);

        [DllImport("user32.dll")]
        public static extern IntPtr WindowFromPoint(Point p);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int left, int top, int width, int height, SetWindowPosFlags uFlags);

        [Flags]
        public enum SetWindowPosFlags : uint
        {
            /// <summary>If the calling thread and the thread that owns the window are attached to different input queues,
            /// the system posts the request to the thread that owns the window. This prevents the calling thread from
            /// blocking its execution while other threads process the request.</summary>
            /// <remarks>SWP_ASYNCWINDOWPOS</remarks>
            AsynchronousWindowPosition = 0x4000,
            /// <summary>Prevents generation of the WM_SYNCPAINT message.</summary>
            /// <remarks>SWP_DEFERERASE</remarks>
            DeferErase = 0x2000,
            /// <summary>Draws a frame (defined in the window's class description) around the window.</summary>
            /// <remarks>SWP_DRAWFRAME</remarks>
            DrawFrame = 0x0020,
            /// <summary>Applies new frame styles set using the SetWindowLong function. Sends a WM_NCCALCSIZE message to
            /// the window, even if the window's size is not being changed. If this flag is not specified, WM_NCCALCSIZE
            /// is sent only when the window's size is being changed.</summary>
            /// <remarks>SWP_FRAMECHANGED</remarks>
            FrameChanged = 0x0020,
            /// <summary>Hides the window.</summary>
            /// <remarks>SWP_HIDEWINDOW</remarks>
            HideWindow = 0x0080,
            /// <summary>Does not activate the window. If this flag is not set, the window is activated and moved to the
            /// top of either the topmost or non-topmost group (depending on the setting of the hWndInsertAfter
            /// parameter).</summary>
            /// <remarks>SWP_NOACTIVATE</remarks>
            DoNotActivate = 0x0010,
            /// <summary>Discards the entire contents of the client area. If this flag is not specified, the valid
            /// contents of the client area are saved and copied back into the client area after the window is sized or
            /// repositioned.</summary>
            /// <remarks>SWP_NOCOPYBITS</remarks>
            DoNotCopyBits = 0x0100,
            /// <summary>Retains the current position (ignores X and Y parameters).</summary>
            /// <remarks>SWP_NOMOVE</remarks>
            IgnoreMove = 0x0002,
            /// <summary>Does not change the owner window's position in the Z order.</summary>
            /// <remarks>SWP_NOOWNERZORDER</remarks>
            DoNotChangeOwnerZOrder = 0x0200,
            /// <summary>Does not redraw changes. If this flag is set, no repainting of any kind occurs. This applies to
            /// the client area, the nonclient area (including the title bar and scroll bars), and any part of the parent
            /// window uncovered as a result of the window being moved. When this flag is set, the application must
            /// explicitly invalidate or redraw any parts of the window and parent window that need redrawing.</summary>
            /// <remarks>SWP_NOREDRAW</remarks>
            DoNotRedraw = 0x0008,
            /// <summary>Same as the SWP_NOOWNERZORDER flag.</summary>
            /// <remarks>SWP_NOREPOSITION</remarks>
            DoNotReposition = 0x0200,
            /// <summary>Prevents the window from receiving the WM_WINDOWPOSCHANGING message.</summary>
            /// <remarks>SWP_NOSENDCHANGING</remarks>
            DoNotSendChangingEvent = 0x0400,
            /// <summary>Retains the current size (ignores the cx and cy parameters).</summary>
            /// <remarks>SWP_NOSIZE</remarks>
            IgnoreResize = 0x0001,
            /// <summary>Retains the current Z order (ignores the hWndInsertAfter parameter).</summary>
            /// <remarks>SWP_NOZORDER</remarks>
            IgnoreZOrder = 0x0004,
            /// <summary>Displays the window.</summary>
            /// <remarks>SWP_SHOWWINDOW</remarks>
            ShowWindow = 0x0040,
        }


        [DllImport("user32.dll", ExactSpelling = true, CharSet = CharSet.Auto)]
        public static extern IntPtr GetParent(IntPtr hWnd);

        public enum ProcessDPIAwareness
        {
            ProcessDPIUnaware = 0,
            ProcessSystemDPIAware = 1,
            ProcessPerMonitorDPIAware = 2
        }

        [DllImport("shcore.dll")]
        public static extern int SetProcessDpiAwareness(ProcessDPIAwareness value);

        public static IList<IntPtr> EnumWindows(IntPtr lParam)
        {
            var callback = new WindowEnumCallback();
            EnumWindows(callback.EnumFunc, lParam);
            return callback.WindowHandles;
        }

        [DllImport("user32.dll")]
        static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        private class WindowEnumCallback
        {
            public IList<IntPtr> WindowHandles { get; private set; } = new List<IntPtr>();

            public bool EnumFunc(IntPtr hWnd, IntPtr lParam)
            {
                WindowHandles.Add(hWnd);
                return true;
            }
        }

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool GetPhysicalCursorPos(out POINT lpPoint);

        [DllImport("user32.dll", SetLastError = false)]
        public static extern IntPtr GetDesktopWindow();
    }

    partial class NativeMethods
    {
        internal class ExternDll
        {
            public const string User32 = "user32.dll";
            public const string Gdi32 = "gdi32.dll";
        }

        [DllImport(ExternDll.User32, CharSet = CharSet.Auto)]
        public static extern bool GetMonitorInfo(HandleRef hmonitor, [In, Out] MONITORINFOEX info);

        [DllImport(ExternDll.User32, ExactSpelling = true)]
        public static extern bool EnumDisplayMonitors(HandleRef hdc, COMRECT rcClip, MonitorEnumProc lpfnEnum, IntPtr dwData);

        [DllImport(ExternDll.User32, ExactSpelling = true)]
        public static extern IntPtr MonitorFromWindow(HandleRef handle, int flags);

        [DllImport(ExternDll.User32, ExactSpelling = true, CharSet = CharSet.Auto)]
        public static extern int GetSystemMetrics(int nIndex);

        [DllImport(ExternDll.User32, CharSet = CharSet.Auto)]
        public static extern bool SystemParametersInfo(int nAction, int nParam, ref RECT rc, int nUpdate);

        [DllImport(ExternDll.User32, ExactSpelling = true)]
        public static extern IntPtr MonitorFromPoint(POINTSTRUCT pt, int flags);

        [DllImport(ExternDll.User32, ExactSpelling = true, CharSet = CharSet.Auto)]
        public static extern bool GetCursorPos([In, Out] POINT pt);

        public static HandleRef NullHandleRef;

        public delegate bool MonitorEnumProc(IntPtr monitor, IntPtr hdc, IntPtr lprcMonitor, IntPtr lParam);

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int left;
            public int top;
            public int right;
            public int bottom;

            public RECT(int left, int top, int right, int bottom)
            {
                this.left = left;
                this.top = top;
                this.right = right;
                this.bottom = bottom;
            }

            public RECT(Rect r)
            {
                this.left = (int)r.Left;
                this.top = (int)r.Top;
                this.right = (int)r.Right;
                this.bottom = (int)r.Bottom;
            }

            public static RECT FromXYWH(int x, int y, int width, int height)
            {
                return new RECT(x, y, x + width, y + height);
            }

            public Size Size
            {
                get { return new Size(this.right - this.left, this.bottom - this.top); }
            }
        }

        // use this in cases where the Native API takes a POINT not a POINT*
        // classes marshal by ref.
        [StructLayout(LayoutKind.Sequential)]
        public struct POINTSTRUCT
        {
            public int x;
            public int y;
            public POINTSTRUCT(int x, int y)
            {
                this.x = x;
                this.y = y;
            }
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT
        {
            public int x;
            public int y;

            public POINT(int x, int y)
            {
                this.x = x;
                this.y = y;
            }

#if DEBUG
            public override string ToString()
            {
                return "{x=" + x + ", y=" + y + "}";
            }
#endif
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto, Pack = 4)]
        public class MONITORINFOEX
        {
            internal int cbSize = Marshal.SizeOf(typeof(MONITORINFOEX));
            internal RECT rcMonitor = new RECT();
            internal RECT rcWork = new RECT();
            internal int dwFlags = 0;
            [MarshalAs(UnmanagedType.ByValArray, SizeConst = 32)] internal char[] szDevice = new char[32];
        }

        [StructLayout(LayoutKind.Sequential)]
        public class COMRECT
        {
            public int left;
            public int top;
            public int right;
            public int bottom;

            public COMRECT()
            {
            }

            public COMRECT(Rect r)
            {
                this.left = (int)r.X;
                this.top = (int)r.Y;
                this.right = (int)r.Right;
                this.bottom = (int)r.Bottom;
            }

            public COMRECT(int left, int top, int right, int bottom)
            {
                this.left = left;
                this.top = top;
                this.right = right;
                this.bottom = bottom;
            }

            public static COMRECT FromXYWH(int x, int y, int width, int height)
            {
                return new COMRECT(x, y, x + width, y + height);
            }

            public override string ToString()
            {
                return "Left = " + left + " Top " + top + " Right = " + right + " Bottom = " + bottom;
            }
        }

        public const int SM_CMONITORS = 80,
                         SM_CXSCREEN = 0,
                         SM_CYSCREEN = 1,
                         SPI_GETWORKAREA = 48;
    }
    /// <summary>
    /// Represents a display device or multiple display devices on a single system.
    /// </summary>
    public class Screen
    {
        // References:
        // http://referencesource.microsoft.com/#System.Windows.Forms/ndp/fx/src/winforms/Managed/System/WinForms/Screen.cs
        // http://msdn.microsoft.com/en-us/library/windows/desktop/dd145072.aspx
        // http://msdn.microsoft.com/en-us/library/windows/desktop/dd183314.aspx

        private readonly IntPtr hmonitor;

        // This identifier is just for us, so that we don't try to call the multimon
        // functions if we just need the primary monitor... this is safer for
        // non-multimon OSes.
        private const int PRIMARY_MONITOR = unchecked((int)0xBAADF00D);

        private const int MONITORINFOF_PRIMARY = 0x00000001;
        private const int MONITOR_DEFAULTTONEAREST = 0x00000002;

        private static bool multiMonitorSupport;

        static Screen()
        {
            multiMonitorSupport = NativeMethods.GetSystemMetrics(NativeMethods.SM_CMONITORS) != 0;
        }

        private Screen(IntPtr monitor)
            : this(monitor, IntPtr.Zero)
        {
        }

        private Screen(IntPtr monitor, IntPtr hdc)
        {
            if (!multiMonitorSupport || monitor == (IntPtr)PRIMARY_MONITOR)
            {
                this.Bounds = SystemInformation.VirtualScreen;
                this.Primary = true;
                this.DeviceName = "DISPLAY";
            }
            else
            {
                var info = new NativeMethods.MONITORINFOEX();

                NativeMethods.GetMonitorInfo(new HandleRef(null, monitor), info);

                this.Bounds = new System.Drawing.Rectangle(
                    info.rcMonitor.left, info.rcMonitor.top,
                    info.rcMonitor.right - info.rcMonitor.left,
                    info.rcMonitor.bottom - info.rcMonitor.top);

                this.Primary = ((info.dwFlags & MONITORINFOF_PRIMARY) != 0);

                this.DeviceName = new string(info.szDevice).TrimEnd((char)0);
            }
            hmonitor = monitor;
        }

        /// <summary>
        /// Gets an array of all displays on the system.
        /// </summary>
        /// <returns>An enumerable of type Screen, containing all displays on the system.</returns>
        public static IEnumerable<Screen> AllScreens
        {
            get
            {
                if (multiMonitorSupport)
                {
                    var closure = new MonitorEnumCallback();
                    var proc = new NativeMethods.MonitorEnumProc(closure.Callback);
                    NativeMethods.EnumDisplayMonitors(NativeMethods.NullHandleRef, null, proc, IntPtr.Zero);
                    if (closure.Screens.Count > 0)
                    {
                        return closure.Screens.Cast<Screen>();
                    }
                }
                return new[] { new Screen((IntPtr)PRIMARY_MONITOR) };
            }
        }

        /// <summary>
        /// Gets the bounds of the display.
        /// </summary>
        /// <returns>A <see cref="T:System.Windows.Rect" />, representing the bounds of the display.</returns>
        public Rectangle Bounds { get; private set; }

        /// <summary>
        /// Gets the device name associated with a display.
        /// </summary>
        /// <returns>The device name associated with a display.</returns>
        public string DeviceName { get; private set; }

        /// <summary>
        /// Gets a value indicating whether a particular display is the primary device.
        /// </summary>
        /// <returns>true if this display is primary; otherwise, false.</returns>
        public bool Primary { get; private set; }

        /// <summary>
        /// Gets the primary display.
        /// </summary>
        /// <returns>The primary display.</returns>
        public static Screen PrimaryScreen
        {
            get
            {
                if (multiMonitorSupport)
                {
                    return AllScreens.FirstOrDefault(t => t.Primary);
                }
                return new Screen((IntPtr)PRIMARY_MONITOR);
            }
        }

        /// <summary>
        /// Gets the working area of the display. The working area is the desktop area of the display, excluding taskbars, docked windows, and docked tool bars.
        /// </summary>
        /// <returns>A <see cref="T:System.Windows.Rect" />, representing the working area of the display.</returns>
        public Rect WorkingArea
        {
            get
            {
                if (!multiMonitorSupport || hmonitor == (IntPtr)PRIMARY_MONITOR)
                {
                    return SystemInformation.WorkingArea;
                }
                var info = new NativeMethods.MONITORINFOEX();
                NativeMethods.GetMonitorInfo(new HandleRef(null, hmonitor), info);
                return new Rect(
                    info.rcWork.left, info.rcWork.top,
                    info.rcWork.right - info.rcWork.left,
                    info.rcWork.bottom - info.rcWork.top);
            }
        }

        /// <summary>
        /// Retrieves a Screen for the display that contains the largest portion of the specified control.
        /// </summary>
        /// <param name="hwnd">The window handle for which to retrieve the Screen.</param>
        /// <returns>A Screen for the display that contains the largest region of the object. In multiple display environments where no display contains any portion of the specified window, the display closest to the object is returned.</returns>
        public static Screen FromHandle(IntPtr hwnd)
        {
            if (multiMonitorSupport)
            {
                return new Screen(NativeMethods.MonitorFromWindow(new HandleRef(null, hwnd), 2));
            }
            return new Screen((IntPtr)PRIMARY_MONITOR);
        }

        /// <summary>
        /// Retrieves a Screen for the display that contains the specified point.
        /// </summary>
        /// <param name="point">A <see cref="T:System.Windows.Point" /> that specifies the location for which to retrieve a Screen.</param>
        /// <returns>A Screen for the display that contains the point. In multiple display environments where no display contains the point, the display closest to the specified point is returned.</returns>
        public static Screen FromPoint(Point point)
        {
            if (multiMonitorSupport)
            {
                var pt = new NativeMethods.POINTSTRUCT((int)point.X, (int)point.Y);
                return new Screen(NativeMethods.MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST));
            }
            return new Screen((IntPtr)PRIMARY_MONITOR);
        }

        /// <summary>
        /// Gets or sets a value indicating whether the specified object is equal to this Screen.
        /// </summary>
        /// <param name="obj">The object to compare to this Screen.</param>
        /// <returns>true if the specified object is equal to this Screen; otherwise, false.</returns>
        public override bool Equals(object obj)
        {
            var monitor = obj as Screen;
            if (monitor != null)
            {
                if (hmonitor == monitor.hmonitor)
                {
                    return true;
                }
            }
            return false;
        }

        /// <summary>
        /// Computes and retrieves a hash code for an object.
        /// </summary>
        /// <returns>A hash code for an object.</returns>
        public override int GetHashCode()
        {
            return (int)hmonitor;
        }

        private class MonitorEnumCallback
        {
            public IList<Screen> Screens { get; private set; }

            public MonitorEnumCallback()
            {
                this.Screens = new List<Screen>();
            }

            public bool Callback(IntPtr monitor, IntPtr hdc, IntPtr lprcMonitor, IntPtr lparam)
            {
                this.Screens.Add(new Screen(monitor, hdc));
                return true;
            }
        }
    }

    public static class SystemInformation
    {
        /// <summary>
        /// Gets the bounds of the virtual screen.
        /// </summary>
        /// <returns>A <see cref="T:System.Windows.Rect" /> that specifies the bounding rectangle of the entire virtual screen.</returns>
        public static Rectangle VirtualScreen
        {
            get
            {
                var size = new Size(NativeMethods.GetSystemMetrics(NativeMethods.SM_CXSCREEN),
                                    NativeMethods.GetSystemMetrics(NativeMethods.SM_CYSCREEN));
                return new Rectangle(0, 0, size.Width, size.Height);
            }
        }

        /// <summary>
        /// Gets the size, in pixels, of the working area of the screen.
        /// </summary>
        /// <returns>A <see cref="T:System.Windows.Rect" /> that represents the size, in pixels, of the working area of the screen.</returns>
        public static Rect WorkingArea
        {
            get
            {
                NativeMethods.RECT rc = new NativeMethods.RECT();
                NativeMethods.SystemParametersInfo(NativeMethods.SPI_GETWORKAREA, 0, ref rc, 0);
                return new Rect(rc.left,
                                rc.top,
                                rc.right - rc.left,
                                rc.bottom - rc.top);
            }
        }
    }
}
