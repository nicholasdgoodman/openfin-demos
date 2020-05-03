using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
using System.Drawing;

//TODO: EVAL IF THIS IS NEEDED
using System.Windows;

using Point = System.Drawing.Point;
using Size = System.Drawing.Size;

namespace NativeHelper
{
    class NativeMethods
    {
        internal class ExternDll
        {
            public const string User32 = "user32.dll";
            public const string Gdi32 = "gdi32.dll";
            public const string ShCore = "shcore.dll";
        }

        [DllImport(ExternDll.User32)]
        public static extern IntPtr WindowFromPoint(Point p);

        [DllImport(ExternDll.User32, SetLastError = true)]
        public static extern bool GetWindowRect(IntPtr hwnd, out RECT lpRect);

        [DllImport(ExternDll.User32, SetLastError = true)]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int left, int top, int width, int height, SetWindowPosFlags uFlags);

        [DllImport(ExternDll.User32)]
        public static extern IntPtr BeginDeferWindowPos(int nNumWindows);

        [DllImport(ExternDll.User32)]
        public static extern IntPtr DeferWindowPos(IntPtr hWinPosInfo, IntPtr hWnd, IntPtr hWndInsertAfter, int x, int y, int cx, int cy, SetWindowPosFlags uFlags);

        [DllImport(ExternDll.User32)]
        public static extern bool EndDeferWindowPos(IntPtr hWinPosInfo);

        [DllImport(ExternDll.User32, ExactSpelling = true, CharSet = CharSet.Auto)]
        public static extern IntPtr GetParent(IntPtr hWnd);

        [DllImport(ExternDll.ShCore)]
        public static extern int SetProcessDpiAwareness(ProcessDPIAwareness value);

        public static IList<IntPtr> EnumWindows(IntPtr lParam)
        {
            var callback = new WindowEnumCallback();
            EnumWindows(callback.EnumFunc, lParam);
            return callback.WindowHandles;
        }

        [DllImport(ExternDll.User32)]
        static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport(ExternDll.User32, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport(ExternDll.User32, CharSet = CharSet.Auto)]
        public static extern bool GetMonitorInfo(IntPtr hmonitor, [In, Out] MONITORINFOEX info);

        [DllImport(ExternDll.User32, ExactSpelling = true)]
        public static extern bool EnumDisplayMonitors(IntPtr hdc, COMRECT rcClip, MonitorEnumProc lpfnEnum, IntPtr dwData);

        [DllImport(ExternDll.User32, ExactSpelling = true, CharSet = CharSet.Auto)]
        public static extern int GetSystemMetrics(int nIndex);

        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
        public delegate bool MonitorEnumProc(IntPtr monitor, IntPtr hdc, IntPtr lprcMonitor, IntPtr lParam);

        private class WindowEnumCallback
        {
            public IList<IntPtr> WindowHandles { get; private set; } = new List<IntPtr>();

            public bool EnumFunc(IntPtr hWnd, IntPtr lParam)
            {
                WindowHandles.Add(hWnd);
                return true;
            }
        }

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

        [Flags]
        public enum SetWindowPosFlags : uint
        {
            /// <summary>If the calling thread and the thread that owns the window are attached to different input queues,
            /// the system posts the request to the thread that owns the window. This prevents the calling thread from
            /// blocking its execution while other threads process the request.</summary>
            /// <remarks>SWP_ASYNCWINDOWPOS</remarks>
            AsyncWindowPos = 0x4000,
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
            NoActivate = 0x0010,
            /// <summary>Discards the entire contents of the client area. If this flag is not specified, the valid
            /// contents of the client area are saved and copied back into the client area after the window is sized or
            /// repositioned.</summary>
            /// <remarks>SWP_NOCOPYBITS</remarks>
            NoCopyBits = 0x0100,
            /// <summary>Retains the current position (ignores X and Y parameters).</summary>
            /// <remarks>SWP_NOMOVE</remarks>
            NoMove = 0x0002,
            /// <summary>Does not change the owner window's position in the Z order.</summary>
            /// <remarks>SWP_NOOWNERZORDER</remarks>
            NoOwnerZOrder = 0x0200,
            /// <summary>Does not redraw changes. If this flag is set, no repainting of any kind occurs. This applies to
            /// the client area, the nonclient area (including the title bar and scroll bars), and any part of the parent
            /// window uncovered as a result of the window being moved. When this flag is set, the application must
            /// explicitly invalidate or redraw any parts of the window and parent window that need redrawing.</summary>
            /// <remarks>SWP_NOREDRAW</remarks>
            NoRedraw = 0x0008,
            /// <summary>Same as the SWP_NOOWNERZORDER flag.</summary>
            /// <remarks>SWP_NOREPOSITION</remarks>
            NoReposition = 0x0200,
            /// <summary>Prevents the window from receiving the WM_WINDOWPOSCHANGING message.</summary>
            /// <remarks>SWP_NOSENDCHANGING</remarks>
            NoSendChanging = 0x0400,
            /// <summary>Retains the current size (ignores the cx and cy parameters).</summary>
            /// <remarks>SWP_NOSIZE</remarks>
            NoSize = 0x0001,
            /// <summary>Retains the current Z order (ignores the hWndInsertAfter parameter).</summary>
            /// <remarks>SWP_NOZORDER</remarks>
            NoZOrder = 0x0004,
            /// <summary>Displays the window.</summary>
            /// <remarks>SWP_SHOWWINDOW</remarks>
            ShowWindow = 0x0040,
        }

        public enum ProcessDPIAwareness
        {
            ProcessDPIUnaware = 0,
            ProcessSystemDPIAware = 1,
            ProcessPerMonitorDPIAware = 2
        }
    }

    public class Screen
    {
        private const int PRIMARY_MONITOR = unchecked((int)0xBAADF00D);
        private const int MONITORINFOF_PRIMARY = 0x00000001;

        public Rectangle Bounds { get; private set; }
        public bool Primary { get; private set; }
        public string DeviceName { get; private set; }

        public Screen(IntPtr monitor)
        {
            var info = new NativeMethods.MONITORINFOEX();

            NativeMethods.GetMonitorInfo(monitor, info);

            Bounds = new Rectangle(
                info.rcMonitor.left,
                info.rcMonitor.top,
                info.rcMonitor.right - info.rcMonitor.left,
                info.rcMonitor.bottom - info.rcMonitor.top);

            Primary = ((info.dwFlags & MONITORINFOF_PRIMARY) != 0);

            DeviceName = new string(info.szDevice).TrimEnd((char)0);
        }

        /// <summary>
        /// Gets an array of all displays on the system.
        /// </summary>
        /// <returns>An enumerable of type Screen, containing all displays on the system.</returns>
        public static IEnumerable<Screen> AllScreens
        {
            get
            {
                var multiMonitorSupport = NativeMethods.GetSystemMetrics(NativeMethods.SM_CMONITORS) != 0;
                if (multiMonitorSupport)
                {
                    var closure = new MonitorEnumCallback();
                    var proc = new NativeMethods.MonitorEnumProc(closure.Callback);
                    NativeMethods.EnumDisplayMonitors(IntPtr.Zero, null, proc, IntPtr.Zero);
                    if (closure.Screens.Count > 0)
                    {
                        return closure.Screens;
                    }
                }
                return new[] { new Screen((IntPtr)PRIMARY_MONITOR) };
            }
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
                Screens.Add(new Screen(monitor));
                return true;
            }
        }
    }
}
