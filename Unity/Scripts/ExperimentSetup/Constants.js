// Constants.js
//
// This script contains contants to be used by other scripts, including:
// - numbers sent to the Eye Tracker parallel port (i.e. event codes).  
// - enumerations
// - default categories
// - Gamepad Button assignments
//
// Created ~5/2011 by DJ.
// Updated 6/8/11 by DJ - added FOLLOW
// Updated 3/13/12 by DJ - added CATEGORIES, CATEGORYSTATES, IS3DCATEGORY, TARGET/DISTRACTOR/UNUSED, and CUBBYSIZE
// Updated 11/22/13 by DJ - simplified
// Updated 12/17/13 by DJ - added GAMEPAD_BUTTONNAMES, comments
// Updated 7/29/14 by DJ - renamed from Numbers to Constants
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

// Parallel port message constants (MUST BE 0-255).
static var START_RECORDING = 200;
static var END_RECORDING = 201;
static var START_TRIAL = 203;
static var END_TRIAL = 206;
static var SYNC = 211;
// presentationType constants
static var PRESENTATIONTYPES = ["Stationary", "Follow"];
static var STATIONARY = 0;
static var FOLLOW = 1;
// Category defaults
static var CATEGORIES = ["car_side", "grand_piano", "laptop", "schooner","Food","Furniture","Instrument","Tool"]; //should be subfolders in Resources folder
static var LEVELS = ["Grid","Snake","Spiral"];
// Category state constants
static var CATEGORYSTATES = ["Distractor", "Target", "Unused"];
static var DISTRACTOR = 0;
static var TARGET = 1;
static var UNUSED = 2;
// Gamepad Button constants
static var GAMEPAD_BUTTONNAMES = ["", "Y", "X", "B", "A", "NUM", "L", "R"]; // Y=1, X=2, B=3, A=4, Numpad=5, L=6, R=7
static var BRAKEBUTTON = 4; // to be pressed when "leading car" puts on brakes
// Other constants
static var CUBBYSIZE = 5.0; //size of each square cubby
