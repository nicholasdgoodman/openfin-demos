using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using System.Drawing;

using NativeHelper.DTO;

namespace NativeHelper
{
    class LayoutEngine
    {
        private readonly Timer pollTimer;
        private readonly object lockObj;

        IntPtr sourceHandle = IntPtr.Zero;
        Dictionary<IntPtr, NativeMethods.RECT> startRects = default;
        NativeMethods.POINT startMouse = default;

        public LayoutEngine()
        {
            pollTimer = new Timer(PollTimerCallback, null, 0, 32);
            lockObj = new object();
        }

        public Snapshot ProcessGetSnapshot(Snapshot snapshot)
        {
            snapshot.Details.Screens = Screen.AllScreens.Select(screen =>
            {
                return new DTO.ScreenInfo()
                {
                    Rectangle = new NativeMethods.RECT(
                        screen.Bounds.Left,
                        screen.Bounds.Top,
                        screen.Bounds.Right,
                        screen.Bounds.Bottom),
                    IsPrimary = screen.Primary,
                    Name = screen.DeviceName
                };
            }).ToArray();

            foreach (var windowEntry in snapshot.Windows)
            {
                if (windowEntry.Name.StartsWith("@@"))
                {
                    continue;
                }

                var handle = windowEntry.NativeId;

                NativeMethods.RECT rect;
                NativeMethods.GetWindowRect(handle, out rect);

                var offset = 8;

                // Check if the corners are visible as a crude
                // edge detection system
                var topLeftHit = HitTest(handle, new Point(rect.left + offset, rect.top + offset));
                var topRightHit = HitTest(handle, new Point(rect.right - offset, rect.top + offset));
                var bottomLeftHit = HitTest(handle, new Point(rect.left + offset, rect.bottom - offset));
                var bottomRightHit = HitTest(handle, new Point(rect.right - offset, rect.bottom - offset));

                var visibleEdges = new EdgeVisibility();
                visibleEdges.Top = topLeftHit && topRightHit;
                visibleEdges.Bottom = bottomLeftHit && bottomRightHit;
                visibleEdges.Left = topLeftHit && bottomLeftHit;
                visibleEdges.Right = topRightHit && bottomRightHit;

                // Window Rect will be in unscaled, physical coordinates
                windowEntry.Rectangle = rect;
                windowEntry.VisibleEdges = visibleEdges;
            }

            // Sort the windows by their Z-Order, Highest appears first in list
            var allWindowsSorted = NativeMethods.EnumWindows(IntPtr.Zero);

            snapshot.Windows = allWindowsSorted
                .Join(snapshot.Windows,
                    nativeId => nativeId,
                    windowEntry => windowEntry.NativeId,
                    (key, item) => item)
                .ToArray();

            return snapshot;
        }

        public void ProcessApplySnapshot(Snapshot snapshot)
        {
            foreach (var windowEntry in snapshot.Windows)
            {
                if (windowEntry.Name.StartsWith("@@"))
                {
                    continue;
                }

                var handle = windowEntry.NativeId;

                var rect = windowEntry.Rectangle;

                // Re-apply Positioning to fix rounding errors
                // caused by using scaled coordinates in the Runtime
                NativeMethods.SetWindowPos(handle, IntPtr.Zero,
                    rect.left,
                    rect.top,
                    rect.right - rect.left,
                    rect.bottom - rect.top,
                    NativeMethods.SetWindowPosFlags.NoActivate | NativeMethods.SetWindowPosFlags.NoZOrder);
            }
        }

        public void ProcessDragStart(DragEventArgs e)
        {
            Console.WriteLine("dragStart");
            var source = e.Source.Name;
            var snapshot = e.Snapshot;
            var windowEntries = snapshot.Windows;

            var sourceEntry = windowEntries
                .FirstOrDefault(entry => entry.Name == source);

            var sourceGroup = sourceEntry.CustomData["groupId"].ToString();

            lock (lockObj)
            {
                startRects = windowEntries
                .Where(entry => entry.CustomData.ContainsKey("groupId") && entry.CustomData["groupId"].ToString() == sourceGroup)
                .Select(entry =>
                {
                    var handle = entry.NativeId;
                    NativeMethods.RECT startRect;
                    NativeMethods.GetWindowRect(handle, out startRect);
                    return new KeyValuePair<IntPtr, NativeMethods.RECT>(handle, startRect);
                }).ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

                //TODO: Make thread safe
                sourceHandle = sourceEntry.NativeId;

                NativeMethods.GetCursorPos(out startMouse);
            }    
        }

        public void ProcessDragEnd()
        {
            Console.WriteLine("dragEnd");
            lock(lockObj)
            {
                sourceHandle = IntPtr.Zero;
                startRects = default;
                startMouse = default;
            }
        }

        void PollTimerCallback(object state)
        {
            lock (lockObj)
            {
                if (sourceHandle != IntPtr.Zero)
                {
                    NativeMethods.POINT mousePos;
                    NativeMethods.GetCursorPos(out mousePos);

                    var dx = mousePos.x - startMouse.x;
                    var dy = mousePos.y - startMouse.y;

                    var winPosInfo = NativeMethods.BeginDeferWindowPos(startRects.Count);

                    foreach (var kvp in startRects.Reverse())
                    {
                        var handle = kvp.Key;
                        var startRect = kvp.Value;

                        winPosInfo = NativeMethods.DeferWindowPos(
                            winPosInfo,
                            handle,
                            IntPtr.Zero,
                            startRect.left + dx,
                            startRect.top + dy,
                            0,
                            0,
                            NativeMethods.SetWindowPosFlags.NoSize);
                    }

                    NativeMethods.EndDeferWindowPos(winPosInfo);
                }
            }
        }

        bool HitTest(IntPtr target, Point point)
        {
            var window = NativeMethods.WindowFromPoint(point);

            while (window != IntPtr.Zero)
            {
                if (window == target)
                {
                    return true;
                }

                window = NativeMethods.GetParent(window);
            }

            return false;
        }
    }
}
