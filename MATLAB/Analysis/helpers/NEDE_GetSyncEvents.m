function [eye,eeg,boundaries] = NEDE_GetSyncEvents(x,EEG,SYNC_CODES)

% Gets the sync events from a NEDE eye position file and EEG file.
%
% [eye,eeg] = NEDE_GetSyncEvents(x,EEG,SYNC_CODES)
%
% INPUTS:
% - x is a NEDE data struct (or vector of structs).
% - EEG is an EEGLAB data struct (containing the corresponding EEG files
% concatenated using pop_mergeset).
% - SYNC_CODES is a vector indicating which parallel port event types will
% be present in both x and EEG. This could be useful, for example, since 
% Sensorium interprets 0 inputs as new events and Biosemi interprets it as
% the end of the previous event... so for Sensorium, SYNC_CODES = [211 0]
% and for Biosemi, SYNC_CODES = 211 (default).
%
% OUTPUTS:
% -eye is an nx3 matrix in which each row is the time, code, and session
% for a sync event reported by the EyeLink.
% -eeg is an nx3 matrix in which each row is the time, code, and session
% for a sync event reported by the EEG system.
% -boundaries is a vector of the indices of between-session boundary events
% in the EEG struct.
%
% Created 2/11/14 by DJ.
% Updated 2/19/14 by DJ - comments.

if nargin<3 || isempty(SYNC_CODES)
    % Set up
    SYNC_CODES = [211]; % numbers that NEDE sends to the EEG through the eye tracker
end

% Extract info from EyeLink struct
nSessions = length(x);
if nSessions>1
    [tim,num,sess] = deal(cell(1,nSessions));
    for i=1:nSessions
        tim{i} = x(i).events.port.time;
        num{i} = x(i).events.port.number;
        sess{i} = repmat(i,length(x(i).events.port.time),1);
    end
    eye = [cat(1,tim{:}),cat(1,num{:}),cat(1,sess{:})];    
else
    % Extract info from the struct we made (for easier access)
    eye = [x.events.port.time, x.events.port.number,ones(length(x.events.port.time),1)]; % times in ms
end

% Extract info from EEG struct
if ischar(EEG.event(1).type)
    boundaries = [0, find(strcmp('boundary',{EEG.event.type})), length(EEG.event)];
    eventSess = zeros(length(EEG.event),1);
    for i=1:numel(boundaries)-1
        eventSess(boundaries(i)+1:boundaries(i+1)) = i;
    end        
    numtypes = cellfun(@str2num,{EEG.event.type},'UniformOutput',false);
    isnumtype = ~cellfun(@isempty,numtypes);
    eeg = [cat(1,EEG.event(isnumtype).latency), cat(1,numtypes{:}),eventSess(isnumtype)];
else
    eeg = [cat(1,EEG.event.latency), cat(1,EEG.event.type),ones(length(EEG.event),1)];
    boundaries = [0, length(EEG.event)];
end

% Crop to sync events
eeg = eeg(ismember(eeg(:,2),SYNC_CODES),:);
eye = eye(ismember(eye(:,2),SYNC_CODES),:);

% Take care of sampling rates, offsets
eeg(:,1) = eeg(:,1)*1000/EEG.srate; % to get time in ms instead of samples
% eeg(:,1) = eeg(:,1) - eeg(1,1); % make time of first event t=0
% eye(:,1) = eye(:,1) - eye(1,1); % make time of first event t=0
