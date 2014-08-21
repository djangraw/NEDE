function [eyeEpochs,objEpochs,isTargetEpoch] = NEDE_GetEyeErps(eyepos,time_ms,x,epoch_time_ms,maxFrameTime)

% Gets the eye position and pupil size from a single session and puts it 
% into a format usable by NEDE_PlotEyeErps.
%
% [eyeEpochs,objEpochs,isTargetEpoch] =
% NEDE_GetEyeErps(eyepos,time_ms,x,epoch_time_ms,maxFrameTime)
%
% Inputs:
%   - eyepos is an nx2 matrix, where n is the number of samples of eye
% position data. Each row is the (x,y) position of the eye at that time.
% This will be the position of the dot on the screen.
%   - time_ms is an n-element vector containing the corresponding time for
%   each sample (in ms).
%   - x is a NEDE data structure as imported by NEDE_ImportData.
%   - epoch_time_ms is a T-element vector indicating the times of desired
%   samples in the epoch (in ms).  [Default = -500:10:3000;]
%   - maxFrameTime (optional) is a scalar indicating the maximum time (in ms)
%   expected between display frames. This will determine whether a delay 
%   between visibility events meanse the object disappeared and reappeared or 
%   not. [default = 100]
%
% Outputs:
%   - eyeEpochs is an nxT matrix of cells, each of which contains [x;y]
%   position of eye for that trial (row) and time (column).
%   - objEpochs is an nxT matrix of cells, each of which contains bounds
%   [xLeft;yTop;width;height] of object for that trial (row) and time 
%   (column).
%   - isTargetEpoch is an nx1 binary vector indicating whether each epoch
%   involved a target object or not.
%
% Created 3/29/11 by DJ.
% Updated 11/3/11 by DJ - added epochRange input to avoid end-of-session 
%   error.
% Updated 11/4/11 by DJ - epochTimes are in eyelink time now.
% Updated 1/27/14 by DJ - adapted to NEDE format.
% Updated 2/19/14 by DJ - added maxFrameTime input, comments.

%% -------- SETUP -------- %
if nargin<4 || isempty(epoch_time_ms)
    epoch_time_ms = -500:10:3000;
end
if nargin<5 || isempty(maxFrameTime)
    maxFrameTime = 100; 
end

% -------- EPOCH -------- %
% Get times at which targets or distractors came onscreen
[eventObject,object_times] = NEDE_GetObjectTimes(x.events.visible);
eventOnset = object_times(:,1);
sampleTimes = nan(numel(eventOnset),numel(epoch_time_ms));
% Get times of every desired sample
for i=1:numel(eventOnset)
    sampleTimes(i,:) = eventOnset(i) + epoch_time_ms;    
end

% Find targets
isTargetEpoch = strcmp('TargetObject',{x.objects(eventObject).tag});

% Get
eyeEpochs = cell(size(sampleTimes));
objEpochs = cell(size(sampleTimes));

for i=1:numel(sampleTimes)
    tSample =  sampleTimes(i);
    % Find most recent eye position sample
    iPos = find(time_ms<=tSample,1,'last');
    if ~isempty(iPos)
        eyeEpochs{i} = eyepos(iPos,:)';
    else
        eyeEpochs{i} = [NaN; NaN];
    end
    % Find most recent object bound
    iLim = find(x.events.visible.time > tSample-maxFrameTime & x.events.visible.time < tSample,1,'last');
    objEpochs{i} = x.events.visible.bounds(iLim,:);
end
