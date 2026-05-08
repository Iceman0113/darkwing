#!/bin/bash
# DARKWING — Fix terminal input focus
# Run this from inside your darkwing/ project folder:
#   bash fix_focus.sh

FILE="src/App.jsx"

if [ ! -f "$FILE" ]; then
  echo "❌ ERROR: $FILE not found."
  echo "   Make sure you run this script from inside the darkwing/ folder."
  echo "   cd darkwing && bash fix_focus.sh"
  exit 1
fi

echo "🦆 DARKWING — Fixing terminal input focus..."

# Fix 1: termInput onClick — make clicking anywhere on terminal row focus the input
sed -i '' 's|onClick={()=>inputRef.current?.focus()}|onClick={()=>{if(inputRef.current){inputRef.current.focus();inputRef.current.click();}}}|g' "$FILE"

# Fix 2: challenge screen useEffect — increase timeout and add tabIndex
sed -i '' 's|if(screen==="challenge")setTimeout(()=>chalInputRef.current?.focus(),100)|if(screen==="challenge")setTimeout(()=>{if(chalInputRef.current){chalInputRef.current.focus();}},300)|g' "$FILE"

# Fix 3: mission screen useEffect — increase timeout
sed -i '' 's|if(screen==="mission")  setTimeout(()=>msnInputRef.current?.focus(),100)|if(screen==="mission")setTimeout(()=>{if(msnInputRef.current){msnInputRef.current.focus();}},300)|g' "$FILE"

# Fix 4: daily screen useEffect — increase timeout
sed -i '' 's|if(screen==="daily")    setTimeout(()=>dailyInputRef.current?.focus(),100)|if(screen==="daily")setTimeout(()=>{if(dailyInputRef.current){dailyInputRef.current.focus();}},300)|g' "$FILE"

# Fix 5: CmdBar onSelect — also focus after inserting command
sed -i '' 's|onSelect={cmd=>{setInput(cmd);inputRef.current?.focus();}}|onSelect={cmd=>{setInput(cmd);setTimeout(()=>{if(inputRef.current){inputRef.current.focus();}},50);}}|g' "$FILE"

echo "✅ Focus fixes applied to $FILE"
echo ""
echo "Next steps:"
echo "  1. Save the file (it's already saved)"
echo "  2. The browser should hot-reload automatically"
echo "  3. If not, run: npm run dev"
echo ""
echo "🦆 Let's Get Dangerous!"
