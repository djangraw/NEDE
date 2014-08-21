function params = NEDE_ParseParams(text_file)

% Reads in parameter values from a NEDE data file.
%
% params = NEDE_ParseParams(text_file)
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
% - params will be a structure of parameters.
%
% Created 1/23/14 by DJ.

% Setup
fid = fopen(text_file);
fseek(fid,0,'eof'); % find end of file
eof = ftell(fid);
fseek(fid,0,'bof'); % rewind to beginning


str = '';
% Find Trial markers and read in object info.
while ftell(fid) < eof && isempty(findstr(str,'SESSION PARAMETERS')) % if we haven't found the session params or reached the end of the text file    
    str = fgetl(fid); % read in next line of text file
end
while ftell(fid) < eof && isempty(findstr(str,'END SESSION PARAMETERS')) % check for the code-word indicating loading started
    str = fgetl(fid); % read in next line of text file
    % Categories are a special case because they place multiple params on the same line    
    if findstr(str,'category:')         
        'category: grand_piano state: Distractor prevalence: 0.25';
        lineinfo = textscan(str,'MSG %*d category: %s state: %s prevalence: %f','Delimiter',',(): ','MultipleDelimsAsOne',true); 
        categoryinfo = struct('name',lineinfo{1}{1},'state',lineinfo{2}{1},'prevalence',lineinfo{3}(1));
        if ~isfield(params,'category')
            params.category = categoryinfo;
        else
            params.category = [params.category, categoryinfo];
        end
        
    % For all other parameters, just transfer the value to a matlab struct
    elseif findstr(str,':') % if it's a parameter              
        lineinfo = textscan(str,'MSG %*d %s%s','Delimiter',',(): ','MultipleDelimsAsOne',true); 
        fieldname = lineinfo{1}{1};
        fieldvalue = lineinfo{2}{1};  
        % transfer numbers/booleans without quotes
        if ~isnan(str2double(fieldvalue)) || ismember(fieldvalue,{'True','False'});
            eval(sprintf('params.%s = %s;',fieldname,lower(fieldvalue))); % use 'lower' to make valid true/false input
        else % transfer strings with quotes
            eval(sprintf('params.%s = ''%s'';',fieldname,fieldvalue));
        end
    end        
end