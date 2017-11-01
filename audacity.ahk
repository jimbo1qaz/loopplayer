; Audacity doesn't let you paste directly into the selection length editor.
; So I whipped up this script which does that for you.

; To use, copy a loopplayer "start.stop" string.
; Set the selection mode to "End samples", highlight the leftmost "samples" cell,
; and press ctrl-alt-V.

; # Win (Windows logo key) 
; ! Alt 
; ^ Control 
; + Shift 
; &  An ampersand may be used between any two keys or mouse buttons to combine them into a custom hotkey.  

; setkeydelay 500


zeropad(num, size) {
	num := trim(num, " `t`n")
	prefix := ""
	; msgbox % "zeropad strlen " . strlen(num)
	loop % (size - strlen(num)) {
		prefix := prefix . "0"
	}
	; msgbox % "prefix " . prefix
	return prefix . num
}

$^!v::
	; ControlGetText OutputVar, Control, WinTitle, WinText, ExcludeTitle, ExcludeText
	; ; msgbox %OutputVar%, %Control%, %WinTitle%, %WinText%, %ExcludeTitle%, %ExcludeText%, %ErrorLevel%

	numbers := strsplit(clipboard, ".")
	output := ""

	for _, value in numbers {
		; msgbox % "buffer " . output
		if strlen(output) {
			output := output . "{Tab}"
		}
		output := output . zeropad(value, 9)
	}

	; ; msgbox % output

	SendEvent % output
	return
