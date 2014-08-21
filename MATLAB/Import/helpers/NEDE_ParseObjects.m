function trialobjects = NEDE_ParseObjects(text_file)

% Reads in object create/destroy info from a NEDE data file.
%
% trialobjects = NEDE_ParseObjects(text_file)
%
% This function reads an EyeLink text file from a NEDE task and
% parses information about the objects created in that task into useful
% structs for later analysis.
%
% INPUTS:
% - text_file is the filename of the Unity Log (something like
% 'NEDE_1pt0-0-0.txt').
%
% OUTPUTS:
% - trialobjects will be an n-element array of cells, where n is the
% number of trials in the file.  Each cell will be an m-element array of
% structs, with each struct trialobjects{i}(j) containing info about object
% #j of trial #i.
%
% Created 6/15/10 by DJ.
% Updated 6/24/10 by DJ - use Eyelink file instead of Unity Log.
% Updated 7/22/10 by DJ - formatting of textscan line has changed.
% Updated 7/26/10 by DJ - fixed strings in struct, handles Destroy All
% Updated 7/29/10 by DJ - store time info (system/Hz-dependent) separately
%   from object info (system-independent).
% Updated 8/25/10 by DJ - require only 'END TRIAL', not 'Destroyed All
%   Objects'.
% Updated 4/13/11 by DJ - added rotation information (started being logged
%   in 3DS version 5.8).
% Updated 10/26/11 by DJ - add support for non-Clone objects
% Updated 1/23/14 by DJ - adapted to NEDE patterns, added destroy search.

% Setup
fid = fopen(text_file);
fseek(fid,0,'eof'); % find end of file
eof = ftell(fid);
fseek(fid,0,'bof'); % rewind to beginning

trialobjects = {}; %each cell is a vector of structs
trial = 0;          % number of trials

% Find Trial markers and read in object info.
while ftell(fid) < eof % if we haven't reached the end of the text file
    % Find the start of a new trial
    str = fgetl(fid); % read in next line of text file
    if findstr(str,'LOAD TRIAL') % check for the code-word indicating loading started
        trial = trial+1; % We've reached the next trial, so increment the trial counter        
        % Get all objects created for this trial
        while ftell(fid) < eof && isempty(findstr(str,'START TRIAL')) % until the trial ends
            str = fgetl(fid); % read in next line of text file
            if findstr(str,'Created Object')
                if ~isempty(findstr(str,'Clone'))
                    objectinfo = textscan(str,'MSG %d Created Object # %d %s Clone %s %s %f %f %f',... % read info about object
                    'Delimiter',',() ','MultipleDelimsAsOne',true); % read info about object (line 2 of 2)
                        % Delimiter field makes us stop reading strings at those
                        % characters (important for the NAME(Clone) objects).
                else
                    objectinfo = textscan(str,'MSG %d Created Object # %d %s %s %s %f %f %f',... % read info about object
                    'Delimiter',',() ','MultipleDelimsAsOne',true); % read info about object (line 2 of 2)
                end
                    
                % Read the info we just parsed using sscanf into the proper variables
                objecttime = objectinfo{1}; 
                objectnum = objectinfo{2};
                objectname = objectinfo{3}{1};
                objecttag = objectinfo{4}{1};
                objecttype = objectinfo{5}{1};
                objectpos = [objectinfo{[6 8]}];
                objectelev = [objectinfo{7}];
                if length(objectinfo)>8
                    objectrot = [objectinfo{9:12}];
                else
                    objectrot = [0 0 0 1];
                end                
                trialobjects{trial}(objectnum) = struct('name','','type','','tag','','position',[],'elevation',[],'rotation',[],'createtime',[],'destroytime',[]);
                trialobjects{trial}(objectnum).name = objectname;
                trialobjects{trial}(objectnum).type = objecttype;
                trialobjects{trial}(objectnum).tag = objecttag;
                trialobjects{trial}(objectnum).position = objectpos;
                trialobjects{trial}(objectnum).elevation = objectelev;
                trialobjects{trial}(objectnum).rotation = objectrot;
                trialobjects{trial}(objectnum).createtime = objecttime;            
            end
        end
        % Search for any points where objects are destroyed
        while ftell(fid) < eof && isempty(findstr(str,'END TRIAL'))
            str = fgetl(fid); % read in next line of text file
            if findstr(str,'Destroyed Object')
                objectinfo = textscan(str,'MSG %d Destroyed Object # %d %s Clone %s %s',... % read info about object
                'Delimiter',',() ','MultipleDelimsAsOne',true); % read info about object (line 2 of 2)
                    % Delimiter field makes us stop reading strings at those
                    % characters (important for the NAME(Clone) objects).
                % Read the info we just parsed using sscanf into the proper variables
                objecttime = objectinfo{1}; 
                objectnum = objectinfo{2};
                trialobjects{trial}(objectnum).destroytime = objecttime; % destroy time
            end
        end
        % Assume any objects not destroyed during the trial are destroyed
        % at the end
        END_time = sscanf(str,'MSG %d'); % End Trial time = DestroyAll time
        for i=1:numel(trialobjects{trial}) % for each object
            if isempty(trialobjects{trial}(i).destroytime)
                trialobjects{trial}(i).destroytime = END_time;
            end
        end
               
    end
end

                