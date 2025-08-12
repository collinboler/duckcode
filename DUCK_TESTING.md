# Duck Modal Testing Guide

## 🦆 Testing the Duck Functionality

### Steps to Test:

1. **Rebuild the Extension**
   ```bash
   pnpm dev
   ```

2. **Reload Extension in Chrome**
   - Go to `chrome://extensions`
   - Click the reload button on DuckCode extension
   - Or disable/enable the extension

3. **Test on LeetCode**
   - Visit any LeetCode problem page (e.g., https://leetcode.com/problems/two-sum/)
   - Wait for the DuckCode modal to appear

4. **Test Duck Functionality**
   - Click the "×" button to close the modal
   - You should see a duck emoji (🦆) in a colored circle in the bottom-right
   - The duck should have:
     - Purple gradient background
     - White border with blue glow
     - Hover effects (lift up and scale)

5. **Test Dragging**
   - Click and drag the duck around the screen
   - It should follow your mouse smoothly
   - When dragging, it should scale up and show "grabbing" cursor

6. **Test Edge Snapping**
   - Drag the duck near any edge of the screen (within 100px)
   - Release the mouse
   - The duck should snap to the edge with a bouncy animation

7. **Test Reopening**
   - Click the duck (don't drag)
   - The modal should reopen

## 🐛 Troubleshooting

If the duck doesn't appear or work correctly:

1. **Check Console Errors**
   - Open DevTools (F12)
   - Look for any JavaScript errors

2. **Verify Extension Reload**
   - Make sure you reloaded the extension after rebuilding

3. **Check if Modal Appears**
   - If the modal doesn't appear at all, the duck won't work
   - Make sure you're on a LeetCode problem page

4. **Force Refresh**
   - Hard refresh the LeetCode page (Ctrl+Shift+R)

## ✅ Expected Behavior

- **Visual**: Duck in purple circle with white/blue outline
- **Dragging**: Smooth dragging with visual feedback
- **Snapping**: Automatic edge snapping within 100px
- **Clicking**: Opens modal (only if not dragged)
- **Positioning**: Remembers position after dragging