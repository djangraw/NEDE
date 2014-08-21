function delay = NEDE_CheckSync(x,EEG)

% Extracts and compares the sync event times according to the eye tracker
% and the EEG to check for consistency.
%
% delay = NEDE_CheckSync(x,EEG)
%
% NOTES:
% - Sync events are sent every couple of seconds from the eyelink (which
% records the time each was sent) to the EEG (which records the time it was
% received). 
% - Sync events will be used to translate eyelink times into EEG times for
% analysis.
%
% INPUTS:
% - x is a NEDE data struct (or vector of structs).
% - EEG is an EEGLAB data struct (containing the corresponding EEG files
% concatenated using pop_mergeset).
%
% Created 6/14/10 by DJ - as part of CheckData.
% Updated 7/28/10 by DJ - made into its own program.
% Updated 7/29/10 by DJ - changed events field back to eyelink.
% Updated 12/6/13 by DJ - added delay output, cleaned up.
% Updated 2/11/14 by DJ - added multi-session support


[eye,eeg] = NEDE_GetSyncEvents(x,EEG);

% Make sure events are the same
if ~isequal(eeg(:,2),eye(:,2)) || ~isequal(eeg(:,3),eye(:,3)) % number of events that aren't in exactly the right spot
    error('Sync events don''t match up!');
else
    disp('All event types match. Checking timing...')
    delay = diff(eeg(:,1))-diff(eye(:,1)); % subtract the time between timestamps    
    delay = delay(diff(eeg(:,3))==0); % only include within-session delays
    subplot(2,1,1)
    hist(delay);
    xlabel('Delay (Time Received - Time Sent) in ms')
    ylabel('# events')
    title('Event Timing Consistency Check');
    subplot(2,1,2);
    delayTimes = eeg(2:end,1);
    boundaryTimes = delayTimes(diff(eeg(:,3))>0); % new-session times
    delayTimes = delayTimes(diff(eeg(:,3))==0); % only include within-session delays
    plot(delayTimes/1000,delay, '.');
    hold on;
    PlotVerticalLines(boundaryTimes/1000,'r--');
    xlabel('Event time (s)');
    ylabel('Delay in ms');
    fprintf('Mean absolute value of delay is %g\n', mean(abs(delay)));
    legend('Events','session boundaries');
end