// ObjectBounds.js
//
// These static functions can be called to get info about the whole object's 
// location and size, even if it has multiple meshes.
//    TO DO: consider using CombineMeshes and resaving prefabs ahead of time, 
// to speed computation during the experiment.
//
// - Created 3/13/12 by DJ.
// - Updated 12/17/13 by DJ - commments.
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

//Get bounds of an object that includes all mesh renderers.
static function ObjectBounds(thisObject: GameObject) {
	var renderers = thisObject.GetComponentsInChildren(MeshRenderer);
	var bound: Bounds;
	if (renderers!=null && renderers.length>0) {
		bound = renderers[0].bounds;
		for (var thisRenderer : MeshRenderer in renderers) {
			bound.Encapsulate(thisRenderer.bounds);
		}
	} else {
		bound = Bounds(Vector3.zero, Vector3.zero);
	}
	return bound;
}

//Get length (max size in any of the 3 dimensions) of a set of bounds.
static function BoundLength(bound : Bounds) {
	var boundLength = Mathf.Max(Mathf.Max(bound.size.x, bound.size.y), bound.size.z);
	return boundLength;
}