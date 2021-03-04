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
        private readonly object lockObj = new object();
        private readonly Timer pollTimer;

        NativeMethods.POINT startMouse = default;
        DragEventArgs dragEventArgs = default;

        public LayoutEngine()
        {
            lockObj = new object();
            pollTimer = new Timer(PollTimerCallback, null, 0, 32);
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
            Console.WriteLine($"dragStart2 {e.DragType}");
            lock (lockObj)
            {
                dragEventArgs = e;
                NativeMethods.GetCursorPos(out startMouse);
            }
        }

        public void ProcessDragEnd()
        {
            Console.WriteLine("dragEnd2");
            lock (lockObj)
            {
                dragEventArgs = null;
            }
        }

        void PollTimerCallback(object state)
        {
            lock (lockObj)
            {
                if(dragEventArgs == null)
                {
                    return;
                }

                var sourceEntry = dragEventArgs.Snapshot.Windows.FirstOrDefault(entry => entry.Name == dragEventArgs.Source.Name);

                var vEdgeId =
                    dragEventArgs.DragType.HasFlag(DragEventType.Left) ? sourceEntry.CustomData.EdgeIds.Left :
                    dragEventArgs.DragType.HasFlag(DragEventType.Right) ? sourceEntry.CustomData.EdgeIds.Right :
                    null;
                var hEdgeId =
                    dragEventArgs.DragType.HasFlag(DragEventType.Top) ? sourceEntry.CustomData.EdgeIds.Top :
                    dragEventArgs.DragType.HasFlag(DragEventType.Bottom) ? sourceEntry.CustomData.EdgeIds.Bottom :
                    null;
                var isMove = dragEventArgs.DragType == DragEventType.Move;


                // UNFILTERED! ALL WINDOWS - TO CHANGE LATER
                var targetWindows = dragEventArgs.Snapshot.Windows.Where(e => 
                    (!isMove || e.CustomData.GroupId == sourceEntry.CustomData.GroupId) &&
                    !e.Name.StartsWith("@@"));


                NativeMethods.POINT mousePos;
                NativeMethods.GetCursorPos(out mousePos);

                var dx = mousePos.x - startMouse.x;
                var dy = mousePos.y - startMouse.y;

                var winPosInfo = NativeMethods.BeginDeferWindowPos(targetWindows.Count());

                foreach (var windowEntry in targetWindows.Reverse())
                {
                    var startRect = windowEntry.Rectangle;
                    var tgtEdges = windowEntry.CustomData.EdgeIds;

                    var newRect = new NativeMethods.RECT(
                        startRect.left + (isMove || tgtEdges.Left == vEdgeId ? dx : 0),
                        startRect.top + (isMove || tgtEdges.Top == hEdgeId ? dy : 0),
                        startRect.right + (isMove || tgtEdges.Right == vEdgeId ? dx : 0),
                        startRect.bottom + (isMove || tgtEdges.Bottom == hEdgeId ? dy : 0));

                    winPosInfo = NativeMethods.DeferWindowPos(
                        winPosInfo,
                        windowEntry.NativeId,
                        IntPtr.Zero,
                        newRect.left,
                        newRect.top,
                        newRect.Size.Width,
                        newRect.Size.Height,
                        isMove ? NativeMethods.SetWindowPosFlags.NoSize : NativeMethods.SetWindowPosFlags.None); // TODO: consider scaling
                }

                NativeMethods.EndDeferWindowPos(winPosInfo);
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
