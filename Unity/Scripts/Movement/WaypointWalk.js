// WayponitWalk.js
//
// This script is in charge of moving the camera according to a pre-programmed 
// series of steps, which it reads in from a text file. Unlike RobotWalk, if a
// straight line between consecutive waypoints does not fall on the grid,  
// WaypointWalk will add in intermediate waypoints to make the route navigable.  
// Note that the grid layout is specific to level MultiGrid. 
//    The reading-in code and navigation code is redundant with RobotWalk, but
// the intermediate waypoint code is distinct. These two scripts could be 
// merged, or this one could use/call RobotWalk, in future versions.
//
// - Created 4/2013 by MG.
// - Updated 12/17/13 by DJ - comments.
// - Updated 6/4/14 by DJ - changed from "Tsp" to "Waypoint"
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

import System.IO;

// variables for Matlab Waypoints
var recordMatlabLines = false;
var useMatlabWaypoints = true;
var mLpoints = new Array();
var fileName = "NEDE-99-waypoints.txt";

// Variables from RobotWalk
var moveSpeed = 3.0; //forward and back, in m/s?
var spinSpeed = 50.0; //horizontal rotation, in deg/s?
var points: Vector2[]; //array of points to hit

var iPoint = 0; // index of point where walk starts
var iEndPoint = 20; //index of point where walk stops
var moveTarget: Vector3;
var turnRadius = 5;
var angleBetween; //angle between current view and target direction
var distanceTraveled = 0.0;

// move constants
static var GOSTRAIGHT = 0;
static var TURNRIGHT = 1;
static var TURNLEFT = 2;
var currentMove = 0;
var nextMove = 0;


// for east / west straight motion  
var northLoop = false;
// TODO, if entering from south, or if i==0 begin with north loop
// else if entering from the north, or if northloop = true goto south loop. 


//Simple control of the camera: up/down arrows move, left/right arrows spin.
function StartRoute() {
	var level = Application.loadedLevelName;
	
	var arrayPoints = new Array();
	var isObjectPoint = new Array(); //will reaching this point mean you've seen an object?
	var i=0; //index for loops below
	var j=0; //other index for loops
	var nToRepeat;  //number of points that are identical (with an offset) to later points
	var NewOffset; //the offset mentioned above
		
	if (useMatlabWaypoints) { // post Matlab calculation traversal 

		ParseMatlabFile();  // scan the Matlab file for Waypoints
		//ShiftWaypointsToRoad(); // correcting the Waypoints to nearest road
		InsertCornerWaypoints(); // splicing in all needed Waypoints for grid traversal
		
		for (vec in mLpoints) arrayPoints.Push(vec);
		
		// tell the script to end here
		iEndPoint = arrayPoints.length;
		// push 2 extra padding wayPoints - duplicates of the last one
		//  that corrects fencepost issues with existing iPoint methodology		
		arrayPoints.Push(mLpoints[0]);
		arrayPoints.Push(mLpoints[0]);
	
	} else {
		Debug.Log("Level name " + level + " not recognized!");
	}
	
	
	//Now that the array of points is set, send it to built-in array for increased speed
	points = arrayPoints.ToBuiltin(Vector2);
	
	//DetermineiEndPoint
	iPoint = 0; // previously iPoint started at 46! 
	// meaning a level above has manipulated it. Here there was previously an iEndPoint = iPoint;
	var nObjSeen = 0;
	
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

	
// function that takes the Matlab output file and turns it into procesessed waypoints
function ParseMatlabFile() {

	
//	Debug.Log ("looking for Matlab Output file at loc: [" + Application.dataPath + "/]"); 
	
	// TODO add safety if statement
	
	//~ var fileName = "3DS-99-99_waypoints.txt";
 	//~ var sr = new StreamReader(Application.dataPath + "/" + fileName);
	var sr = new StreamReader(fileName);
 	var fileContents = sr.ReadToEnd();
 	sr.Close();
 	
	fileContents = fileContents.Replace("\r\n","\n"); // Resolve Mac/PC difference in carriage returns
 	var lines = fileContents.Split("\n"[0]);
 	
    for (line in lines) {
        
        if (line == "----- END ROUTE -----") {
    		recordMatlabLines = false;	
        }
		
        // Debug.Log ("line: [" + line + "] recording Matlab line? [" + recordMatlabLines + "]");
      
      
    
        if (recordMatlabLines){
		
			var valSegs:String[]=line.Split("("[0])[1].Split(","[0]);
			var xStr = valSegs[0];
		
        	
        	// flipping the matlab coordinates to conform with parent 
        	// orientation!!! (x, y) in matlab == (y, x) in mLpoins list
        	// so that the parent grid can be viewed as an x, y coordinate plane 
        	// without rotating it and risking data loss
			
        	var yStr = valSegs[1].Substring(0, valSegs[1].Length-1);
        	
        	// TRACING of raw (x,y)
        	//Debug.Log("xStr: " + xStr + "yStr " + yStr);
        	mLpoints.Push(Vector2(float.Parse(xStr),float.Parse(yStr)));
        	
        	// TRACING 
        	//Debug.Log ("inner line: " + line + "mLpoints.length " + mLpoints.length );
		}
        
        if (line == "----- ROUTE -----") {
        	recordMatlabLines = true;
		}
    
    }
	if (mLpoints.length==0) {
		Debug.Log("No Points were read in... Filling with 3 random points to avoid error.");
		mLpoints.Push(Vector2(0,20));
		mLpoints.Push(Vector2(0,60));
		mLpoints.Push(Vector2(60,60));
	}
}

// heart of class. Here, depending on the direction of the car relative to the next
// waypoint, and the NSWE poisition of one wayopint relative to the next, corner 
// waypoints are computed and spliced into the list of waypoints. 
function InsertCornerWaypoints() {
	
//	Debug.Log ("PRE splice mLpoints: [" + mLpoints +"]");

	tempArray = new Array();
	// main for loop, iterate through all waypoint
	for ( var i = 0 ; i < mLpoints.length ; i++ ) 
	{
		if (i!= mLpoints.length-1)
		{ // if we are dealing with the first n-1 items, compare them to eachother
		
			// assume the first point obeys forward motion algorithms
			if (i!=0) 
			{		
				// forward motion scenario!
				if (isMovingForward(mLpoints[i], mLpoints[i+1], mLpoints[i-1]))
				{
					// if the x's are different, we require splicing since the case is 
					// either diagonal or horizontal, both of which require added waypoints
					if (mLpoints[i].x != mLpoints[i+1].x /* && mLpoints[i].y != mLpoints[i+1].y */)
					{	
						spliceTwoCorners(mLpoints, tempArray, i);
//						Debug.Log ("2. POST forward motion mLpoints: [" + mLpoints +"]");
					}
				}
				// uTurn or backward diagonal scenario!
	 			else if (!isMovingForward(mLpoints[i], mLpoints[i+1], mLpoints[i-1]))
	 			{
	 				spliceBackCorners(mLpoints, tempArray, i);
//					Debug.Log ("3. POST back motion mLpoints: [" + mLpoints +"]");			
				}
			}
			// if it's the first item, insert and test if the next item is diagonal
			else 
			{
//				Debug.Log ("1. PRE forward motion mLpoints: [" + mLpoints +"]");
							
				if (mLpoints[i].x != mLpoints[i+1].x/* && mLpoints[i].y != mLpoints[i+1].y*/)
					spliceTwoCorners(mLpoints, tempArray, i);
				
					
//				Debug.Log ("1. POST forward motion mLpoints: [" + mLpoints +"]");
			}
		}		
	}	
//	Debug.Log ("POST splice mLpoints: [" + mLpoints +"]");
}



// splices two way points in a diagonal waypoint situation
function spliceTwoCorners (mLpoints : Array, tempArray : Array, i : int)
{	
	// South bound (diagonal)
	if ( mLpoints[i].y > mLpoints[i+1].y && mLpoints[i].y != mLpoints[i+1].y) 
	{ 
//	 	Debug.Log("case 1");
		mLpoints.splice(i+1, 0, Vector2(mLpoints[i].x, mLpoints[i].y-10), Vector2(mLpoints[i+1].x, mLpoints[i].y-10));
	}
	// North bound (diagonal) 
	else if ( mLpoints[i].y < mLpoints[i+1].y && mLpoints[i].y != mLpoints[i+1].y) 
	{ 
//		Debug.Log("case 2");
		northLoop = true;
			
		mLpoints.splice(i+1, 0,Vector2(mLpoints[i].x, mLpoints[i].y+10),Vector2(mLpoints[i+1].x, mLpoints[i].y+10)); 
	}
	// Eastward / Westward bound (straight) 
	else if (mLpoints[i].y == mLpoints[i+1].y  )
	{ 
//		Debug.Log("case 3: mLpoints[i].y" + mLpoints[i].y );
		
		// only if its a multiple of 20, the intention is to add waypoints (else its already an added waypoint!)
		if ( mLpoints[i].y%20==0 && ( i>0 && ((mLpoints[i].y > mLpoints[i-1].y) || (!northLoop && !(mLpoints[i].y < mLpoints[i-1].y)))) ||
			( i == 0 && !northLoop))
		{
			northLoop = true;
			mLpoints.splice(i+1, 0,Vector2(mLpoints[i].x, mLpoints[i].y+10),Vector2(mLpoints[i+1].x, mLpoints[i].y+10)); 
			  	
		}
		else if ( mLpoints[i].y%20==0 && ( i>0 && ((mLpoints[i].y < mLpoints[i-1].y) || (northLoop && !(mLpoints[i].y > mLpoints[i-1].y)))) ||
		( i == 0 && northLoop))
		{
			northLoop = false;
			mLpoints.splice(i+1, 0, Vector2(mLpoints[i].x, mLpoints[i].y-10), Vector2(mLpoints[i+1].x, mLpoints[i].y-10));
		}
	}
}




// splices two way points in a diagonal waypoint situation
function spliceBackCorners (mLpoints : Array, tempArray : Array, i : int)
{
//	Debug.Log("[top of spliceBackCorners] i == " + i);	
	
	var xShift = 15;
	var yShift = 10;
	
	// if we're moving North, uTurn
	if (mLpoints[i].y > mLpoints[i-1].y && mLpoints[i].x == mLpoints[i-1].x && mLpoints[i].x == mLpoints[i+1].x) 
	{
		// splice 4 waypoints around the uTurn
		mLpoints.splice(i+1, 0, Vector2(mLpoints[i].x, mLpoints[i].y+yShift), Vector2(mLpoints[i].x+xShift, mLpoints[i].y+yShift), Vector2(mLpoints[i].x+xShift, mLpoints[i].y-yShift), Vector2(mLpoints[i].x, mLpoints[i].y-yShift));
	
//		Debug.Log ("North uTurn case");

	}	
	// if we're moving South, uTurn
	else if (mLpoints[i].y < mLpoints[i-1].y && mLpoints[i].x == mLpoints[i-1].x && mLpoints[i].x == mLpoints[i+1].x) 
	{
		// splice 4 waypoints around the uTurn
		mLpoints.splice(i+1, 0, Vector2(mLpoints[i].x, mLpoints[i].y-yShift), Vector2(mLpoints[i].x-xShift, mLpoints[i].y-yShift), Vector2(mLpoints[i].x-xShift, mLpoints[i].y+yShift), Vector2(mLpoints[i].x, mLpoints[i].y+yShift));
	
//		Debug.Log ("South uTurn case");
	}	
	// if we're moving north then diagonally
	else if (mLpoints[i].y > mLpoints[i-1].y && mLpoints[i].x == mLpoints[i-1].x && mLpoints[i].x != mLpoints[i+1].x) 
	{
		// splice 2 points from here on
		mLpoints.splice(i+1, 0, Vector2(mLpoints[i].x, mLpoints[i].y+yShift), Vector2(mLpoints[i+1].x, mLpoints[i].y+yShift));
	
//		Debug.Log ("north then diagonally");
	}	
	
	// if we're moving south then diagonally
	else if (mLpoints[i].y < mLpoints[i-1].y && mLpoints[i].x == mLpoints[i-1].x && mLpoints[i].x != mLpoints[i+1].x)  // if we're moving east (cool), TODO fix NORTH AND SOUTH BUG AFTER VERIFICATION FROM DAVE
	{
		mLpoints.splice(i+1, 0, Vector2(mLpoints[i].x, mLpoints[i].y-yShift), Vector2(mLpoints[i+1].x, mLpoints[i].y-yShift));
//		Debug.Log ("South motion then diagonally, spliced [" + Vector2(mLpoints[i].x, mLpoints[i].y-yShift) + "] into array");	
	}
	// if we're moving East, West uTurn
	else if (mLpoints[i].x != mLpoints[i-1].x && mLpoints[i].y == mLpoints[i-1].y && mLpoints[i].y == mLpoints[i+1].y && northLoop) 
	{
		
		mLpoints.splice(i+1, 0, Vector2(mLpoints[i].x, mLpoints[i].y-10), Vector2(mLpoints[i+1].x, mLpoints[i].y-10));
		northLoop = false;
//		Debug.Log ("West / East uTurn motion south loop");
	}
	else if (mLpoints[i].x != mLpoints[i-1].x && mLpoints[i].y == mLpoints[i-1].y && mLpoints[i].y == mLpoints[i+1].y && !northLoop) 
	{
		mLpoints.splice(i+1, 0, Vector2(mLpoints[i].x, mLpoints[i].y+10), Vector2(mLpoints[i+1].x, mLpoints[i].y+10));

		northLoop = true;
//		Debug.Log ("West / East uTurn motion north loop");
	}
	
		// if we're moving East, West back diagonal coming from south insert north loop
	else if (mLpoints[i].x != mLpoints[i-1].x && mLpoints[i].y == mLpoints[i-1].y && mLpoints[i].y < mLpoints[i+1].y) 
	{
		mLpoints.splice(i+1, 0,Vector2(mLpoints[i].x, mLpoints[i+1].y+10), Vector2(mLpoints[i+1].x, mLpoints[i+1].y+10));

		northLoop = true;
//		Debug.Log ("West / East back diagonal from south motion");
	}
		// if we're moving East, West back diagonal  coming from north insert south loop
	else if (mLpoints[i].x != mLpoints[i-1].x && mLpoints[i].y == mLpoints[i-1].y && mLpoints[i].y > mLpoints[i+1].y) 
	{
		mLpoints.splice(i+1, 0, Vector2(mLpoints[i].x, mLpoints[i+1].y-10), Vector2(mLpoints[i+1].x, mLpoints[i+1].y-10));
	
		northLoop = false;
//		Debug.Log ("West / East back diagonal from north motion");
	}
}



function isMovingForward(A : Vector2, postA : Vector2 , preA : Vector2 ) {
	
	
	// needs to move back
	if ((preA.x > A.x && postA.x > A.x) 
		|| (preA.x < A.x && postA.x < A.x)
		|| (preA.y > A.y && postA.y > A.y)
		|| (preA.y < A.y && postA.y < A.y)) 
			return false;
	
	// needs to Uturn
	//else if ((preA.x == A.x && postA.x == A.x) 
	//		|| (preA.y == A.y && postA.x == A.y) ) 
	//			return false;
	
	// moving forward!
	else return true;
	
}



function ShiftWaypointsToRoad() {

	// TRACING raw waypoints
	//for (vec in mLpoints) Debug.Log ("vec pre-shift: " + vec);
	
	/* TODO if left Waypoint shift right, else */
	for (vec in mLpoints) 
		{
			vec.y = vec.y-1;
	
			if (((vec.x/7.5)%1)>.5) { vec.x = vec.x - 4.25 ; } 
			else { vec.x = vec.x + 4.25; }
		}
	// TRACING processed waypoints
	//for (vec in mLpoints) Debug.Log ("vec POST-shift: " + vec);
	
}

// -------------------------------------------- new additions end
	
	
	 
	
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
		if (nextMove==GOSTRAIGHT /* && iPoint < mLpoints.Length-1*/ ) {
			if (Vector3.Distance(transform.position,moveTarget) < (Time.deltaTime * moveSpeed) ) { // if we're basically on top of the target
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
		
			if (Vector3.Distance(transform.position,moveTarget) < turnRadius) 
			{ //if we're close enough to start the turn
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
	//if a and b are equal in the x direction
	if (currentPosition.x==currentTarget.x) {
		if (nextTarget.x==currentTarget.x) {
			return GOSTRAIGHT;
		} else if ((currentTarget.y > currentPosition.y && nextTarget.x > currentTarget.x) || (currentTarget.y < currentPosition.y && nextTarget.x < currentTarget.x)) { // (^,>) or (v,<)
			return TURNRIGHT;
		} else {
			return TURNLEFT;
		}
	//if a and b are equal in the y direction
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
	var placerScript = gameObject.GetComponent(RunWaypointRoute);
	if (placerScript!=null) { // if this is the object in charge of the trial (the camera with PlaceAll attached), end the level
		placerScript.EndLevel();
		Application.LoadLevel("Loader");
	} else { // otherwise just end the level without cleanup.
		Application.LoadLevel("Loader");
		//~ Destroy(this);
	}
}