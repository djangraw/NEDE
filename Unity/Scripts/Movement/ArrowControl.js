//ArrowControl.js
//
// This script is in charge of moving the camera according to keyboard or 
// joystick input.  
//    Speed variables are dictated by the caller script at level startup,
// but they can also be changed on the fly in Unity's inspector panel.  
//
// - Created ~5/2011 by DJ.
//
//---------------------------------------------------------------
// Copyright (C) 2014 David Jangraw, <www.nede-neuro.org>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//    
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.
//---------------------------------------------------------------

// Variables allow you to control the speed of motion.
var moveSpeed = 5.0; //forward and back, in m/s
var spinSpeed = 50.0; //horizontal rotation, in deg/s

//Simple control of the camera: up/down arrows move, left/right arrows spin.
function Update () { 
	var x = Input.GetAxis("Vertical") * Time.deltaTime * moveSpeed; 
	var z = Input.GetAxis("Horizontal") * Time.deltaTime * spinSpeed; 
	transform.Translate(0, 0, x); 
	transform.Rotate(0,z,0);
} 
