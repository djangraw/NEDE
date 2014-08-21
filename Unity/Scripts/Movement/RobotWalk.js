// RobotWalk.js
//
// This script is in charge of moving the camera according to a pre-programmed 
// series of waypoints we read in from a text file.
//    Each line of the file should be in the format "X,Z,P", where (X,Z) is the
// waypoint and P is a binary value indicating whether an object will be viewed  
// by reaching that waypoint.
//    Note that the route waypoints must trace a grid - only 90 degree turns 
// are currently supported.
//
// - Created 5/12 by DJ.
// - Updated 11/21/13 by DJ - added ParseRouteFile (adapted from function by MG)
// - Updated 12/17/13 by DJ - comments.
// - Updated 1/8/14 by DJ - route files in NedeConfig folder
//
//---------------------------------------------------------------
// Copyright (C) 2014 David Jangraw and Meron Gribetz, <www.nede-neuro.org>
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

import System.IO; // for route file reading

// Variables allow you to control the speed of motion.
var moveSpeed = 3.0; //forward and back, in m/s?
var turnRadius = 5;
var points: Vector2[]; //array of points to hit
var isObjectPoint: float[];
var iPoint = 0;
var iEndPoint = 20;
var nObjToSee = 20;
var nObjects = 0;
var distanceTraveled = 0.0; // used to gauge distance between leader and follower
// private variables
private var moveTarget: Vector3;
private var spinSpeed : float; //horizontal rotation, in deg/s?
private var angleBetween; //angle between current view and target direction

// move code variables
var currentMove = 0;
var nextMove = 0;

// move code constants
static var GOSTRAIGHT = 0;
static var TURNRIGHT = 1;
static var TURNLEFT = 2;


// function that takes the Route file and turns it into procesessed waypoints
function ParseRouteFile(pointsFilename: String) {
	
	// TODO: complete safety if statement
	if (!ReadLog.FileExists(pointsFilename)) {			
		Debug.Log("File " + pointsFilename + " Not Found!");
		
	} else {
		// Read in entire text file
		var sr = new StreamReader(pointsFilename);
	 	var fileContents = sr.ReadToEnd();
	 	sr.Close();
	 	// Split so that each line is an array element
		fileContents = fileContents.Replace("\r\n","\n"); // Resolve Mac/PC difference in carriage returns
	 	var lines = fileContents.Split("\n"[0]);
	 	var coords : String[];
	 	// initialize arrays of points and isObject values
	 	var arrayPoints = new Array();
	 	var arrayIsObjPt = new Array();
	 	// Read in line and add to array
	 	nObjects = 0;
	    for (line in lines) {	       	
			coords = ReadLog.splitString(line,",");
	       	arrayPoints.Push(Vector2(parseFloat(coords[0]),parseFloat(coords[1])));
	       	arrayIsObjPt.Push(parseFloat(coords[2]));
			nObjects = nObjects + parseFloat(coords[2]);
	    }
	    // Catch if error
		if (arrayPoints.length==0) {
			Debug.Log("No Points were read in.");
		}
		//Now that the array of points is set, send it to built-in array for increased speed
		points = arrayPoints.ToBuiltin(Vector2);
		isObjectPoint = arrayIsObjPt.ToBuiltin(float);
	}
	yield;
}


// Find the last point we should start at to see the right number of objects.
function FindLastOkStartPoint() {
	// If we traversed route backwards, at what point would we see nObjToSee objects?
	var nObjSeen = 0;
	for (var i=points.length-1; i>=0; i--) {
		nObjSeen = nObjSeen + isObjectPoint[i];
		if (nObjSeen==nObjToSee) {
			break;
		}
	}
	return i;
}	



//Simple control of the camera: up/down arrows move, left/right arrows spin.
function StartRoute(iStartPoint: int) {
	var i=0; //index for loops below
	var j=0; //other index for loops
	var nToRepeat;  //number of points that are identical (with an offset) to later points
	var NewOffset; //the offset mentioned above
	
	// READ IN ROUTE FILE
	if (points == null || points.length==0) {
		ParseRouteFile("NedeConfig/" + Application.loadedLevelName + ".txt");
	}
	
	//DetermineiEndPoint
	iPoint = iStartPoint;
	iEndPoint = iPoint;
	var nObjSeen = 0;
	while ((nObjSeen<nObjToSee) && (iEndPoint<points.length-1)) {
		iEndPoint++;
		nObjSeen += isObjectPoint[iEndPoint];
	}
	iEndPoint++; // Add one point that we won't actually pass
	
	//move camera to starting point
	transform.position = Vector3(points[iPoint].x, transform.position.y, points[iPoint].y);
	iPoint++; //initiate next point as target of first movement
	moveTarget = Vector3(points[iPoint].x, transform.position.y, points[iPoint].y); // get this location
	transform.LookAt(moveTarget); //rotate to the target	
	
	//set up moves
	currentMove = GOSTRAIGHT;
	nextMove = FindNextMove(points[iPoint-1], points[iPoint], points[iPoint+1]);
	//calculate spin speed
	spinSpeed = 180 * moveSpeed / (Mathf.PI * turnRadius); 
}


// Determine current goal and move towards it
function Update () { 
	//Pause for a moment before we begin walking
	if (Time.timeSinceLevelLoad<1.5) { 
		return;
	}

	// move forward
	transform.Translate(0,0,Time.deltaTime * moveSpeed); 
	distanceTraveled += Time.deltaTime*moveSpeed;

	if (currentMove==GOSTRAIGHT) {
		// have we reached the next point?
		if (nextMove==GOSTRAIGHT) {
			if (Vector3.Distance(transform.position,moveTarget) < (Time.deltaTime * moveSpeed)) { // if we're almost on top of the target
				iPoint++;
				// check for end of walk
				if (iPoint==iEndPoint || iPoint>=(points.length-1)) { //if this is the end of our path
					EndWalk();
				}
				// update moves
				currentMove = nextMove;
				nextMove = FindNextMove(points[iPoint-1], points[iPoint], points[iPoint+1]);
				// get new target				
				moveTarget = Vector3(points[iPoint].x, transform.position.y, points[iPoint].y);
			}
		} else { // if a turn is coming up
			if (Vector3.Distance(transform.position,moveTarget) < turnRadius) { //if we're close enough to start the turn
				iPoint++;
				// check for end of walk
				if (iPoint==iEndPoint || iPoint>=(points.length-1)) { //if this is the end of our path
					EndWalk();
				}
				// update moves
				currentMove = nextMove;
				nextMove = FindNextMove(points[iPoint-1], points[iPoint], points[iPoint+1]);
				// get new target	
				moveTarget = Vector3(points[iPoint].x, transform.position.y, points[iPoint].y);
			}
		}
	} else { //Turn	
		// determine speed of spinning, in case moveSpeed has changed
		spinSpeed = 180 * moveSpeed / (Mathf.PI * turnRadius);
		//determine if we're done turning
		var targetDir = moveTarget - transform.position;
		var angleBetween = Vector3.Angle(transform.forward, targetDir);
		if (angleBetween < (Time.deltaTime*spinSpeed)) { // if next rotation would bring us too far
			//We're done turning!  
			//Align with target
			if (points[iPoint-1].x == moveTarget.x) { //...in x direction 
				transform.position.x = moveTarget.x;
			} else if (points[iPoint-1].y == moveTarget.z) { //...or in z direction
				transform.position.z = moveTarget.z;
			}
			//Start going straight
			transform.LookAt(moveTarget);
			currentMove = GOSTRAIGHT;
		} else if (currentMove==TURNRIGHT) { //If we're not done turning yet
			transform.Rotate(0,Time.deltaTime * spinSpeed,0); //turn right
		} else {
			transform.Rotate(0,-Time.deltaTime * spinSpeed,0); //turn left
		}
	}
	
	
} 


//Determine whether moving from point a to b to c means making a right turn, left turn, or going straight.
function FindNextMove(currentPosition: Vector2, currentTarget: Vector2, nextTarget: Vector2) {
	//if current and next points are equal in the x direction
	if (currentPosition.x==currentTarget.x) {
		if (nextTarget.x==currentTarget.x) {
			return GOSTRAIGHT;
		} else if ((currentTarget.y > currentPosition.y && nextTarget.x > currentTarget.x) || (currentTarget.y < currentPosition.y && nextTarget.x < currentTarget.x)) { // (^,>) or (v,<)
			return TURNRIGHT;
		} else {
			return TURNLEFT;
		}
	//if current and next points are equal in the y direction
	} else if (currentPosition.y==currentTarget.y) {
		if (nextTarget.y==currentTarget.y) {
			return GOSTRAIGHT;
		} else if ((currentTarget.x > currentPosition.x && nextTarget.y < currentTarget.y) || (currentTarget.x < currentPosition.x && nextTarget.y > currentTarget.y)) { // (>,v) or (<,^)
			return TURNRIGHT;
		} else {
			return TURNLEFT;
		}
	}
}


// Finish the walk by either ending the level or destroying the script
function EndWalk() {
	var placerScript = gameObject.GetComponent(PlaceAll);
	if (placerScript!=null) { // if this is the object in charge of the trial (the camera with PlaceAll attached), end the level
		placerScript.EndLevel();
		Application.LoadLevel("Loader");
	} else { // otherwise just end the level without cleanup.
		Application.LoadLevel("Loader");
	}
}