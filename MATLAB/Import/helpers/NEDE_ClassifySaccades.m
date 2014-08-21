function [objectSeen,isFirstToObject,isLastToObject] = NEDE_ClassifySaccades(saccade, visible, pixelThresholds, timeLimits)

% Decides on the first saccade to each object and returns an event list.
%
% [objectSeen,isFirstToObject,isLastToObject] = NEDE_ClassifySaccades(saccade, visible,
% pixelThresholds, timeLimits)
%
% INPUTS:
% -saccade_times is an nx1 vector of times at which saccades ended, where
% n is the number of saccades in the current session.
% -saccade_positions is an nx2 matrix of the x and y positions of each 
% saccade's endpoint.
% -object_limits is an mx7 matrix, where m is the number of frames in which
% an object was visible.  The first column is an eyelink timestamp, and the
% second is the number of the object visible at that time.  The next four
% columns represent the left, top, width and height of the object's visual 
% limits on-screen at that time. The final column is the fraction of the 
% object that was visible at that time. (created by get_objectlimits)
% -pixelThresholds (optional) is a vector of distances (in pixels, from the
% saccade endpoint to the object) that a saccade must be within to be
% considered a saccade "to the object". The first saccade inside 
% pixelThresholds(1) will be used. If that doesn't exist, the first saccade 
% inside threshold 2 will be used (and so on). [Default: 50 100 150]
% -timeLimits is a 2-element vector with the start and end times, in ms,
% that are acceptable for a saccade to be counted.  [Default: 0 Inf]
%
% OUTPUTS:
% - objectSeen is an n-element vector (where n is the number of saccades)
% indicating which object was viewed with that saccade. If no object was
% viewed, objectSeen(i) = NaN.
% - isFirstToObject is an n-element vector of binary values indicating
% whether a saccade was the first to an object.
% - isLastToObject is an n-element vector of binary values indicating
% whether a saccade was the last to an object.
%
% Created 8/19/10 by DJ.
% Updated 2/23/11 by DJ - made pixelThresholds an optional input, added
% timeLimits, fixed no-saccade error by initializing ts_saccades to 
% zeros(0,2); 
% Updated 1/27/14 by DJ - adapted to NEDE format.
% Updated 2/19/14 by DJ - bug fixes, comments

% SET UP
if nargin<4
    pixelThresholds = [50 100 150]; % default
end
if nargin<5
    timeLimits = [0 Inf];
end

% Get times at which each object started and stopped being visible
[object_nums,object_times] = NEDE_GetObjectTimes(visible);
visible_objects = unique(object_nums);

% Set up
objectSeen = nan(length(saccade.time_end),1);
isFirstToObject = false(length(saccade.time_end),1);
isLastToObject = false(length(saccade.time_end),1);

% The first saccade inside threshold 1 will be used.  
% If that doesn't exist, the first saccade inside threshold 2 will be used.
% etc. etc.

% Find the first saccade to an object, every time it appears.
for i=1:numel(visible_objects);
    obj = visible_objects(i);
    % Find the times when this object is onscreen
    appeartimes = object_times(object_nums==obj, 1);
    disappeartimes = object_times(object_nums==obj, 2);
    
    % Find the first saccade to the object during each appearance
    for j=1:numel(appeartimes)
        % Find saccades in acceptable time range
        if (appeartimes(j)+timeLimits(2)) < disappeartimes(j) % if specified time range is smaller than appearance duration
            sac_subset = find(saccade.time_end > (appeartimes(j)+timeLimits(1)) & saccade.time_end < (appeartimes(j)+timeLimits(2)) ); % within specified time range
        else
            sac_subset = find(saccade.time_end > (appeartimes(j)+timeLimits(1)) & saccade.time_end < disappeartimes(j)); % within time of object visibility
        end
        % Find the distance from each applicable saccade to the object's
        % bounding box
        dist = Inf(numel(sac_subset),1); % the distance to the bounding box (preallocate for speed)
        for k=1:numel(sac_subset)
            % Get the time when this object was last seen
            t = saccade.time_end(sac_subset(k));
            iLastLimit = find(visible.object==obj & visible.time<t, 1, 'last');
            % Get object limits
            left = visible.bounds(iLastLimit,1);
            top = visible.bounds(iLastLimit,2);
            width = visible.bounds(iLastLimit,3);
            height = visible.bounds(iLastLimit,4);
            % Get saccade position
            x = saccade.position_end(sac_subset(k),1);
            y = saccade.position_end(sac_subset(k),2);
            % Get shortest distance from saccade position to object box
            if x<left
                dx = left-x;
            elseif x>left+width
                dx = x-(left+width);
            else 
                dx = 0;
            end
            if y<top
                dy = top-y;
            elseif y>top+height
                dy = y-(top+height);
            else
                dy = 0;
            end
            dist(k) = sqrt(dx*dx + dy*dy);
        end
        
        % Apply rules to find first saccade to the object during this appearance
        for l=1:numel(pixelThresholds)
            iToObj = find(dist<pixelThresholds(l));            
            if ~isempty(iToObj) % if at least one passes test
                break;
            end
        end
        if ~isempty(iToObj)
%             disp(sprintf('distance = %g', dist(k_firstsac)));
            objectSeen(sac_subset(iToObj)) = obj;
            isFirstToObject(sac_subset(iToObj(1))) = true;
            isLastToObject(sac_subset(iToObj(end))) = true;            
%         else
%             disp(sprintf('closest = %g', min(dist)));
        end
    end
end

