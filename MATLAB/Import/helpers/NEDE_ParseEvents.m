function datastruct = NEDE_ParseEvents(text_file,types,start_code,end_code)

% Logs specified NEDE event types and arrange into data struct.
%
% datastruct = NEDE_ParseEvents(text_file,types,start_code,end_code)
%
% INPUTS:
% - text_file should be the filename of the eyelink text file.
%    To create the eyelink text file, run the .edf file created during a
%    NEDE experiment through the program Visual EDF2ASC.  For
%    event_type 'eyesample', use the EDF2ASC option 'samples only' or
%    'samples and events.'  Everything else requires 'events only' or
%    'samples and events.'
%
% EVENT TYPES AND CORRESPONDING DATASTRUCT FIELDS:
% - 'blink': times at which a blink began and ended.
% - 'button': times at which a button was pressed and number of that button
% - 'eyesample': x and y position of the eye at each sample, size of the
%    pupil at each sample
% - 'fixation': start and end time of each fixation, average x and y 
%    position of the eye during the fixation.
% - 'saccade': start and end time of the saccade, start and end position of
%    the eye during the saccade.
% - 'port': timestamp and number of each message sent.
% - 'trial': time when the trial start message was sent, trial type 
%    identifier number.
% - 'leader': time at which leader slowed down or sped up
% - 'camera': time, position & rotation of camera at each frame update
% - 'fixupdate': time, position of eye at each frame update
% - 'visible': time, object number, bounding box and fraction visible of 
%    any objects visible during a given frame
% - 'message': other text not covered by above options (NOTE: this must be
%    last, or it will 'steal' messages from the types listed above.
% - GENERIC display option: if the specified type is not any of the above, 
%    the program will search for 'MSG <x> <y> <event_type>', and will 
%    return x-y (the time when eyelink reports that it displayed the event).
%
% Created 11/12/10 by DJ.
% Updated 2/25/11 by DJ - added saccade start output
% Updated 5/31/11 by DJ - comments
% Updated 7/28/11 by DJ - added 2nd output for button option
% Updated 10/17/11 by DJ - added trialtype option for Squares experiment
% Updated 3/4/13 by DJ - added generic display option ('otherwise' in code)
% Updated 12/5/13 by DJ - added leader option
% Updated 1/23/14 by DJ - added types/start/end_code inputs, ioport-->port,
%  added fixupdate/visible/message options
% Updated 2/10/14 by DJ - updated fixupdate option, types default
% Updated 2/19/14 by DJ - fixed end trial bug

if nargin<2 || isempty(types)
    types = {'saccade','fixation','blink','fixupdate','button','trial','port','leader','camera','visible'};%,'message'};
end
if nargin<3 || isempty(start_code)
    start_code = '~~~';
    found_start_code = true;
else
    found_start_code = false;
end
if nargin<4 || isempty(end_code)
    end_code = '~~~';
end

    
% Set up
fid = fopen(text_file);
fseek(fid,0,'eof'); % find end of file
eof = ftell(fid);
fseek(fid,0,'bof'); % rewind to beginning

% Set the parameters for our search
% word: the word we check for to find relevant events
% format: the format we use in sscanf to turn a line of text into values of interest
% values: the values returned by sscanf (we specify the # of columns here)
[words,formats,values] = deal(cell(size(types)));
for i=1:numel(types)
    switch types{i}
        case 'blink'
            words{i} = 'EBLINK'; 
            formats{i} = 'EBLINK %*s %d %d'; % Message format: EBLINK <eye (R/L)> <blinkstart> <blinkend>
            values{i} = zeros(0,2);
        case 'button'
            words{i} = 'BUTTON';
            formats{i} = 'BUTTON %d %d %d'; % Message format: BUTTON <time> <button #> <state>
            values{i} = zeros(0,3);
        case 'eyesample'
            words{i} = '...';
            formats{i} = '%*d %f %f %f'; % Message format: <time> <xpos> <ypos> <pupilsize> ...
            values{i} = zeros(0,3);
        case 'fixation'
            words{i} = 'EFIX';
            formats{i} = 'EFIX %*s %d %d %*d %f %f %*f'; % Message format: EFIX <eye> <starttime> <endtime> <duration> <avgxpos> <avgypos> <avgpupilsize>
            values{i} = zeros(0,4);
        case 'saccade'
            words{i} = 'ESACC';
            formats{i} = 'ESACC %*s %d %d %*d %f %f %f %f'; % Message format: ESACC <eye> <starttime> <endtime> <duration> <startx> <starty> <endx> <endy> <amp> <peakvelocity>    
            values{i} = zeros(0,6);
        case 'port'
            words{i} = 'write_ioport';
            formats{i} = 'MSG %d !CMD %*d write_ioport 0x378 %d'; % Message format: MSG <time> !CMD <delay???> write_ioport 0x378 <msgnumber>
            values{i} = zeros(0,2);
        case 'trial'
            words{i} = 'TRIAL';
            formats{i} = 'MSG %d ----- %s TRIAL';
            values{i} = zeros(0,2);       
        case 'leader'
            words{i} = 'Leader';
            formats{i} = 'MSG %d Leader %s';
            values{i} = zeros(0,2);
        case 'camera'
            words{i} = 'Camera';
            formats{i} = 'MSG %d Camera at (%f, %f, %f) rotation (%f, %f, %f, %f)';
            values{i} = zeros(0,8);
        case 'fixupdate'
            words{i} = 'Eye at';
            formats{i} = 'MSG %d Eye at (%f, %f)';
            values{i} = zeros(0,3);
        case 'visible'
            words{i} = 'visible';
            formats{i} = 'MSG %d Object %d visible at (left:%f, top:%f, width:%f, height:%f) fracVisible %f';
            values{i} = zeros(0,7);            
        case 'message'
            words{i} = 'MSG';
            formats{i} = 'MSG %d';
            values{i} = zeros(0,1);
            messages = cell(0,1);
        otherwise
            warning('FindEvents:InputType','event_type input %s not recognized!',types{i});
            words{i} = types{i};
            formats{i} = ['MSG %d %d ' types{i}];
            values{i} = zeros(0,2);
    end
end


% Get the messages we're looking for
% each row of 'values' will be the info for one line (e.g., timestamp,
% event)
while ftell(fid) < eof % if we haven't reached the end of the text file
    str = fgetl(fid); % read in next line of text file
    % Check for start code
    if ~found_start_code 
        if isempty(findstr(str,start_code)) % if we haven't found start code yet
            continue; % skip to next line
        else
            found_start_code = true;
        end
    end        
    % Otherwise, Read in line
    for i=1:numel(types)
        isMatch = false;
        if findstr(str,words{i}) % check for the code-word indicating a message was written
            isMatch = true;
            stuff = sscanf(str,formats{i})';
            if size(stuff,2)==size(values{i},2)
                values{i} = [values{i}; stuff]; % add the info from this line as an additional row
            elseif strcmp(types{i},'eyesample')
                values{i} = [values{i}; NaN,NaN,NaN]; % add a blank sample so the time points still line up
            elseif strcmp(types{i},'leader')
                if strcmpi(char(stuff(2:end)),'Slow')
                    values{i} = [values{i}; stuff(1), 1]; % second item will be 'is this slow (1) or fast (2)?'
                elseif strcmpi(char(stuff(2:end)),'Fast')
                    values{i} = [values{i}; stuff(1), 2]; 
                end
            elseif strcmp(types{i},'trial')                
                if strcmpi(char(stuff(2:end)),'START')
                    values{i} = [values{i}; stuff(1), 1]; % trial start time
                elseif strcmpi(char(stuff(2:end)),'END')
                    values{i} = [values{i}; stuff(1), 2]; % trial start time
                else
                    values{i} = [values{i}; stuff(1), 0]; % trial load time, etc.
                end
            else
                warning('FindEvents:IncompleteEvent','Eyelink was unable to log the following event fully:\n %s',str); % sometimes saccades are not logged fully
            end
            break;
        end        
    end
    % record message
    if isMatch && strcmp(types{i},'message')
        [~,~,~,msgIndex] = sscanf(str,'MSG %*d %*d');
        messages = [messages; {str(msgIndex:end)}];
    end
    % Check for end code
    if ~isempty(findstr(str,end_code))
        break;
    end
end

% Clean up
fclose(fid);


for i=1:numel(types)
    % Rearrange the values into the desired output
    switch types{i}
        case 'blink'
            datastruct.blink.time_start = values{i}(:,1); % first output is times at which a blink started
            datastruct.blink.time_end = values{i}(:,2); % second output is times at which a blink ended
        case 'button'
            datastruct.button.time = values{i}(values{i}(:,3) == 1,1); % first output is times at which any button was pressed
            datastruct.button.number = values{i}(values{i}(:,3) == 1,2); % second output is number of the button was pressed
        case 'eyesample'
            datastruct.eyesample.position = values{i}(:,1:2); % first output is the x and y position of the eye
            datastruct.eyesample.pupilsize = values{i}(:,3); % second output is the pupil size
        case 'fixation'
            datastruct.fixation.time_start = values{i}(:,1); % first output is timestamp of start and end of fixation
            datastruct.fixation.time_end = values{i}(:,2); % first output is timestamp of start and end of fixation
            datastruct.fixation.position = values{i}(:,3:4); % second output is avg. x and y position of eye during fixation
        case 'saccade'
            datastruct.saccade.time_end = values{i}(:,2); % first output is timestamp of end of saccade
            datastruct.saccade.position_end = values{i}(:,5:6); % second output is x and y position of eye at end of saccade
            datastruct.saccade.time_start = values{i}(:,1); % third output is timestamp of start of saccade
            datastruct.saccade.position_start = values{i}(:,3:4); % fourth output is x and y position of eye at start of saccade
        case 'port'
            datastruct.port.time = values{i}(:,1); % 1st output is timestamp sent
            datastruct.port.number = values{i}(:,2); % 2nd output is message sent
        case 'trial'
            datastruct.trial.time_start = values{i}(values{i}(:,2)==1,1); % first output is Trial start time
            datastruct.trial.time_end = values{i}(values{i}(:,2)==2,1); % second output is Trial end time        
        case 'leader'            
            datastruct.leader.time_slow = values{i}(values{i}(:,2)==1,1); % slow times
            datastruct.leader.time_fast = values{i}(values{i}(:,2)==2,1); % fast times
        case 'camera'
            datastruct.camera.time = values{i}(:,1);
            datastruct.camera.position = values{i}(:,[2 4]);
            datastruct.camera.elevation = values{i}(:,3);
            datastruct.camera.rotation = values{i}(:,5:8);
        case 'fixupdate'
            datastruct.fixupdate.time = values{i}(:,1);
            datastruct.fixupdate.position = values{i}(:,2:3);
        case 'visible'
            datastruct.visible.time = values{i}(:,1);           
            datastruct.visible.object = values{i}(:,2);
            datastruct.visible.bounds = values{i}(:,3:6);
            datastruct.visible.fraction = values{i}(:,7);            
        case 'message'
            datastruct.message.time = values{i}; % first output is display time
            datastruct.message.text = messages;                
        otherwise 
%             error('event_type input %s not recognized!',event_type);
            datastruct.(types{i}).time = values{i}(:,1)-values{i}(:,2); % first output is display time                
    end

end