function [xAfter yAfter] = NEDE_ApplyEyeCalibration(xBefore, yBefore, info)

% Converts eye position from Eyelink coordinates to Unity coordinates.
%
% [xAfter yAfter] = NEDE_ApplyEyeCalibration(xBefore, yBefore, info)
% xyAfter = NEDE_ApplyEyeCalibration(xyBefore, info)
% xOut = ApplyEyeCalibration(x)
%
% INPUTS:
%   - xBefore and yBefore are 1xn vectors of horizontal and vertical eye 
%     positions (e.g., the raw eye position reported by eyelink).
%   - info is a calibration struct with fields offset_x, offset_y, gain_x
%     and gain_y.
%   - xyBefore is a 2-column matrix in which the first column is horizontal
%     eye positions and the second is vertical eye positions before 
%     calibration.
%   - x (optional) is a NEDE data structure as imported by NEDE_ImportData. 
%     It must, specifically, have the x.params.eyelink field intact.
%
% OUTPUTS:
%   - xAfter and yAfter are the corresponding 1xn vectors of horizontal and
%     vertical eye position that accurately reflect the subject's eye
%     position in screen coordinates during the Unity experiment.
%   - xyAfter is a 2-column matrix in which the first column is horizontal
%     eye positions and the second is vertical eye positions after
%     calibration.
%   - xOut is identical to x, but with calibration applied to the position 
%     fields of saccades, fixations, and fixupdates.
% 
% Created 10/1/10 by DJ.
% Updated 3/28/11 by DJ - allows two-column [x,y] input and output.
% Updated 5/6/11 by DJ - comments.
% Updated 8/8/11 by DJ - added isCalibrated check to prevent calibrating twice
% Updated 11/8/11 by DJ - avoid error for non-raw inputs in isCalibrated
% Updated 5/13/13 by DJ - added x --> xOut format
% Updated 12/5/13 by DJ - added empty input check
% Updated 2/19/14 by DJ - comments.

% Empty in, empty out
if isempty(xBefore)
    xAfter = [];
    yAfter = [];
    return;
end

% (xy, info) input format
if nargin==2 && nargout==1 % two-column input and output format
    % properly parse inputs
    info = yBefore;
    yBefore = xBefore(:,2);
    xBefore = xBefore(:,1);
end

% x --> xOut format
if nargin==1 && nargout==1
    % get input
    x = xBefore;
    % Adjust saccade and fixation positions  
    fprintf('Calibrating saccade start positions...')
    x.events.saccade.position_start = NEDE_ApplyEyeCalibration(x.events.saccade.position_start, x.params.eyelink);
    fprintf('Calibrating saccade end positions...')
    x.events.saccade.position_end = NEDE_ApplyEyeCalibration(x.events.saccade.position_end, x.params.eyelink);
    fprintf('Calibrating fixation positions...')
    x.events.fixation.position = NEDE_ApplyEyeCalibration(x.events.fixation.position, x.params.eyelink);
    fprintf('Calibrating fixupdate positions...')
    x.events.fixupdate.position = NEDE_ApplyEyeCalibration(x.events.fixupdate.position, x.params.eyelink);
    % set output
    xAfter = x;
    return;
end

    

% perform calibration
xAfter = (xBefore - info.offset_x) * info.gain_x;
yAfter = (yBefore - info.offset_y) * info.gain_y;

disp('Calibration complete!')

% (xy, info) output format
if nargin==2 && nargout==1 % two-column input and output format
    % concatenate outputs
    xAfter = [xAfter, yAfter];
end




