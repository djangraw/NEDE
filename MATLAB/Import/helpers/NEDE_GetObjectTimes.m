function [object_nums,object_times] = NEDE_GetObjectTimes(visible, maxFrameTime)

% Generates a timestamp and event number for each time an object enters or
% exits the subject's view.
%
% [object_nums, object_times] = NEDE_GetObjectTimes(visible, maxFrameTime)
% 
% INPUTS:
% - object_limits is an nx6 matrix, where n is the number of frames in
% which an object was visible.  It is the output of get_objectlimits.m.
% - maxFrameTime (optional) is a scalar indicating the maximum time (in ms)
% expected between display frames. This will determine whether a delay 
% between visibility events meanse the object disappeared and reappeared or 
% not. [default = 100ms]
%
% OUTPUTS:
% -object_times is an mx2 matrix, where m is the number of frames in
% which an object entered or exited the scene.
%
% Created 8/18/10 by DJ.
% Updated 8/19/10 by DJ - added Numbers.LAG_BETWEEN_FRAMES
% Updated 1/27/14 by DJ - adapted to NEDE format
% Updated 2/19/14 by DJ - comments.

% Inputs
if nargin<2 || isempty(maxFrameTime)
    maxFrameTime = 100; 
end
threshold = maxFrameTime; % time (in ms) between sightings for something to be considered an exit and re-entrance.

% Setup
all_objects = unique(visible.object); % all objects that were seen
times = visible.time; % extract times for easy access.
object_nums = [];
object_times = [];

% Get object events
for i = 1:numel(all_objects)
    ontimes = times(visible.object==all_objects(i));
    iGaps = find(diff(ontimes)>threshold);
    appeartimes = ontimes([1; iGaps]);   
    disappeartimes = ontimes([iGaps+1; end]);
    object_nums = [object_nums; repmat(all_objects(i),numel(appeartimes),1)];
    object_times = [object_times; cat(2,appeartimes, disappeartimes)];    
end

% Sort into chronological order
[foo order] = sort(object_times(:,1));
object_times = object_times(order,:);
object_nums = object_nums(order);