function varargout = NEDE_ImportGui(varargin)
% NEDE_IMPORTGUI M-file for NEDE_ImportGui.fig
%      NEDE_IMPORTGUI, by itself, creates a new NEDE_IMPORTGUI or raises the existing
%      singleton*.
%
%      H = NEDE_IMPORTGUI returns the handle to a new NEDE_IMPORTGUI or the handle to
%      the existing singleton*.
%
%      NEDE_IMPORTGUI('CALLBACK',hObject,eventData,handles,...) calls the local
%      function named CALLBACK in NEDE_IMPORTGUI.M with the given input arguments.
%
%      NEDE_IMPORTGUI('Property','Value',...) creates a new NEDE_IMPORTGUI or raises the
%      existing singleton*.  Starting from the left, property value pairs are
%      applied to the GUI before NEDE_ImportGui_OpeningFcn gets called.  An
%      unrecognized property name or invalid value makes property application
%      stop.  All inputs are passed to NEDE_ImportGui_OpeningFcn via varargin.
%
%      *See GUI Options on GUIDE's Tools menu.  Choose "GUI allows only one
%      instance to run (singleton)".
%
% See also: GUIDE, GUIDATA, GUIHANDLES

% Edit the above text to modify the response to help NEDE_ImportGui

% Last Modified by GUIDE v2.5 19-Feb-2014 12:39:29

% Begin initialization code - DO NOT EDIT
gui_Singleton = 1;
gui_State = struct('gui_Name',       mfilename, ...
                   'gui_Singleton',  gui_Singleton, ...
                   'gui_OpeningFcn', @NEDE_ImportGui_OpeningFcn, ...
                   'gui_OutputFcn',  @NEDE_ImportGui_OutputFcn, ...
                   'gui_LayoutFcn',  [] , ...
                   'gui_Callback',   []);
if nargin && ischar(varargin{1})
    gui_State.gui_Callback = str2func(varargin{1});
end

if nargout
    [varargout{1:nargout}] = gui_mainfcn(gui_State, varargin{:});
else
    gui_mainfcn(gui_State, varargin{:});
end
% End initialization code - DO NOT EDIT


% --- Executes just before NEDE_ImportGui is made visible.
function NEDE_ImportGui_OpeningFcn(hObject, eventdata, handles, varargin)
% This function has no output args, see OutputFcn.
% hObject    handle to figure
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)
% varargin   command line arguments to NEDE_ImportGui (see VARARGIN)

% Choose default command line output for NEDE_ImportGui
handles.output = hObject;

% Update handles structure
guidata(hObject, handles);

% UIWAIT makes NEDE_ImportGui wait for user response (see UIRESUME)
% uiwait(handles.figure1);


% --- Outputs from this function are returned to the command line.
function varargout = NEDE_ImportGui_OutputFcn(hObject, eventdata, handles) 
% varargout  cell array for returning output args (see VARARGOUT);
% hObject    handle to figure
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Get default command line output from handles structure
varargout{1} = handles.output;


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%                        BUTTON FUNCTIONS                                 %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

% --- Executes on button press in button_importEye.
function button_importEye_Callback(hObject, eventdata, handles)
% hObject    handle to button_importEye (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Get info from GUI fields
handles.experiment = get(handles.edit_experiment,'string');
subject_str = get(handles.edit_subject,'string');
handles.subject = str2num(subject_str);
sessions_str = get(handles.edit_sessions,'string');
handles.sessions = str2num(sessions_str);
pixelthresh_str = get(handles.edit_pixelthresh,'string');
handles.pixelthresh = str2num(pixelthresh_str);
% eegsessions_str = get(handles.edit_eegsessions,'string');
% handles.eegsessions = str2num(eegsessions_str);
% filetype_str = get(handles.popup_filetype,'string');
% handles.filetype = filetype_str{get(handles.popup_filetype,'value')};
% handles.singlesuffix = get(handles.edit_singlesuffix,'string');
guidata(hObject,handles); % Save variables


for i=1:numel(handles.sessions)
    % Run functions to import data
    set(handles.text_status,'string',sprintf('Importing NEDE session %d/%d...',i,numel(handles.sessions)));
    NEDE_ImportData(handles.experiment,handles.subject,handles.sessions(i),handles.pixelthresh);
%     NEDE_ImportToEeglab(handles.experiment,handles.subject,handles.sessions(i),handles.eegsessions(i),handles.filetype);
%     NEDE_AddEeglabEvents(handles.experiment,handles.subject,handles.sessions(i),handles.singlesuffix);
end
set(handles.text_status,'string',sprintf('Done Importing %d NEDE sessions!',numel(handles.sessions)));


% --- Executes on button press in button_browseForEeg.
function button_browseForEeg_Callback(hObject, eventdata, handles)
% hObject    handle to button_browseForEeg (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

filename = uigetfile('*.set','Select EEGLAB Merged NEDE File');
if ~isequal(filename,0)
    set(handles.edit_eegFilename,'string',filename);
end
guidata(hObject,handles); % Update handles struct



% --- Executes on button press in button_checksync.
function button_checksync_Callback(hObject, eventdata, handles)
% hObject    handle to button_checksync (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

eegFilename = get(handles.edit_eegFilename,'string');
if ~exist(eegFilename,'file')
    set(handles.text_status,'string',sprintf('File %s not found!',eegFilename));
    guidata(hObject,handles); % Update handles struct    
else
    EEG = pop_loadset(eegFilename);
    for i=1:length(handles.sessions)
        eyeFilename = sprintf('%s-%d-%d.mat',handles.experiment,handles.subject,...
            handles.sessions(i));
        load(eyeFilename); % x
        y(i) = x;
    end
    figure;
    handles.delay = NEDE_CheckSync(y,EEG);
    guidata(hObject,handles); % Update handles struct    
end

% --- Executes on button press in button_addEvents.
function button_addEvents_Callback(hObject, eventdata, handles)
% hObject    handle to button_addEvents (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

eegFilename = get(handles.edit_eegFilename,'string');
newEegFilename = get(handles.edit_newEegFilename,'string');
if ~exist(eegFilename,'file')
    set(handles.text_status,'string',sprintf('File %s not found!',eegFilename));
    guidata(hObject,handles); % Update handles struct    
else
    EEG = pop_loadset(eegFilename);
    for i=1:length(handles.sessions)
        eyeFilename = sprintf('%s-%d-%d.mat',handles.experiment,handles.subject,...
            handles.sessions(i));
        load(eyeFilename); % x
        y(i) = x;
    end
    EEG2 = NEDE_AddEeglabEvents(y,EEG);   
    pop_saveset(EEG2,'filename',newEegFilename);    
    disp('DONE!');
end

% --- Executes on button press in button_browseForNewEeg.
function button_browseForNewEeg_Callback(hObject, eventdata, handles)
% hObject    handle to button_browseForNewEeg (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

filename = uiputfile('*.set','Select Filename to Save');
if ~isequal(filename,0)
    set(handles.edit_newEegFilename,'string',filename);
end
guidata(hObject,handles); % Update handles struct


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%                        UNUSED FUNCTIONS                                  %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

function edit_subject_Callback(hObject, eventdata, handles)
% hObject    handle to edit_subject (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_subject as text
%        str2double(get(hObject,'String')) returns contents of edit_subject as a double



% --- Executes during object creation, after setting all properties.
function edit_subject_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_subject (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_sessions_Callback(hObject, eventdata, handles)
% hObject    handle to edit_sessions (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_sessions as text
%        str2double(get(hObject,'String')) returns contents of edit_sessions as a double


% --- Executes during object creation, after setting all properties.
function edit_sessions_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_sessions (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on selection change in popup_filetype.
function popup_filetype_Callback(hObject, eventdata, handles)
% hObject    handle to popup_filetype (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: contents = cellstr(get(hObject,'String')) returns popup_filetype contents as cell array
%        contents{get(hObject,'Value')} returns selected item from popup_filetype


% --- Executes during object creation, after setting all properties.
function popup_filetype_CreateFcn(hObject, eventdata, handles)
% hObject    handle to popup_filetype (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: popupmenu controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end






function edit_eyesession_Callback(hObject, eventdata, handles)
% hObject    handle to edit_eyesession (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_eyesession as text
%        str2double(get(hObject,'String')) returns contents of edit_eyesession as a double


% --- Executes during object creation, after setting all properties.
function edit_eyesession_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_eyesession (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit5_Callback(hObject, eventdata, handles)
% hObject    handle to edit5 (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit5 as text
%        str2double(get(hObject,'String')) returns contents of edit5 as a double


% --- Executes during object creation, after setting all properties.
function edit5_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit5 (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on button press in check_blinks.
function check_blinks_Callback(hObject, eventdata, handles)
% hObject    handle to check_blinks (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of check_blinks


% --- Executes on button press in check_cutoff.
function check_cutoff_Callback(hObject, eventdata, handles)
% hObject    handle to check_cutoff (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of check_cutoff



function edit_cutoff_Callback(hObject, eventdata, handles)
% hObject    handle to edit_cutoff (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_cutoff as text
%        str2double(get(hObject,'String')) returns contents of edit_cutoff as a double


% --- Executes during object creation, after setting all properties.
function edit_cutoff_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_cutoff (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on selection change in popup_timelock.
function popup_timelock_Callback(hObject, eventdata, handles)
% hObject    handle to popup_timelock (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: contents = cellstr(get(hObject,'String')) returns popup_timelock contents as cell array
%        contents{get(hObject,'Value')} returns selected item from popup_timelock


% --- Executes during object creation, after setting all properties.
function popup_timelock_CreateFcn(hObject, eventdata, handles)
% hObject    handle to popup_timelock (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: popupmenu controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on button press in check_doloo.
function check_doloo_Callback(hObject, eventdata, handles)
% hObject    handle to check_doloo (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of check_doloo


% --- Executes on button press in check_bootstrap.
function check_bootstrap_Callback(hObject, eventdata, handles)
% hObject    handle to check_bootstrap (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of check_bootstrap



function edit_spw_Callback(hObject, eventdata, handles)
% hObject    handle to edit_spw (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_spw as text
%        str2double(get(hObject,'String')) returns contents of edit_spw as a double


% --- Executes during object creation, after setting all properties.
function edit_spw_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_spw (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_sps_Callback(hObject, eventdata, handles)
% hObject    handle to edit_sps (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_sps as text
%        str2double(get(hObject,'String')) returns contents of edit_sps as a double


% --- Executes during object creation, after setting all properties.
function edit_sps_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_sps (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_eegsessions_Callback(hObject, eventdata, handles)
% hObject    handle to edit_eegsessions (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_eegsessions as text
%        str2double(get(hObject,'String')) returns contents of edit_eegsessions as a double


% --- Executes during object creation, after setting all properties.
function edit_eegsessions_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_eegsessions (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on selection change in popup_version.
function popup_version_Callback(hObject, eventdata, handles)
% hObject    handle to popup_version (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: contents = cellstr(get(hObject,'String')) returns popup_version contents as cell array
%        contents{get(hObject,'Value')} returns selected item from popup_version


% --- Executes during object creation, after setting all properties.
function popup_version_CreateFcn(hObject, eventdata, handles)
% hObject    handle to popup_version (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: popupmenu controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on selection change in popup_reference.
function popup_reference_Callback(hObject, eventdata, handles)
% hObject    handle to popup_reference (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: contents = cellstr(get(hObject,'String')) returns popup_reference contents as cell array
%        contents{get(hObject,'Value')} returns selected item from popup_reference


% --- Executes during object creation, after setting all properties.
function popup_reference_CreateFcn(hObject, eventdata, handles)
% hObject    handle to popup_reference (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: popupmenu controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on selection change in popup_eventsrule.
function popup_eventsrule_Callback(hObject, eventdata, handles)
% hObject    handle to popup_eventsrule (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: contents = cellstr(get(hObject,'String')) returns popup_eventsrule contents as cell array
%        contents{get(hObject,'Value')} returns selected item from popup_eventsrule


% --- Executes during object creation, after setting all properties.
function popup_eventsrule_CreateFcn(hObject, eventdata, handles)
% hObject    handle to popup_eventsrule (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: popupmenu controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_singlesuffix_Callback(hObject, eventdata, handles)
% hObject    handle to edit_singlesuffix (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_singlesuffix as text
%        str2double(get(hObject,'String')) returns contents of edit_singlesuffix as a double


% --- Executes during object creation, after setting all properties.
function edit_singlesuffix_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_singlesuffix (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_combosuffix_Callback(hObject, eventdata, handles)
% hObject    handle to edit_combosuffix (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_combosuffix as text
%        str2double(get(hObject,'String')) returns contents of edit_combosuffix as a double


% --- Executes during object creation, after setting all properties.
function edit_combosuffix_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_combosuffix (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_pixelthresh_Callback(hObject, eventdata, handles)
% hObject    handle to edit_pixelthresh (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_pixelthresh as text
%        str2double(get(hObject,'String')) returns contents of edit_pixelthresh as a double


% --- Executes during object creation, after setting all properties.
function edit_pixelthresh_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_pixelthresh (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_timelimits_Callback(hObject, eventdata, handles)
% hObject    handle to edit_timelimits (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_timelimits as text
%        str2double(get(hObject,'String')) returns contents of edit_timelimits as a double


% --- Executes during object creation, after setting all properties.
function edit_timelimits_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_timelimits (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_duds_Callback(hObject, eventdata, handles)
% hObject    handle to edit_duds (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_duds as text
%        str2double(get(hObject,'String')) returns contents of edit_duds as a double


% --- Executes during object creation, after setting all properties.
function edit_duds_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_duds (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_inputsuffix_Callback(hObject, eventdata, handles)
% hObject    handle to edit_inputsuffix (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_inputsuffix as text
%        str2double(get(hObject,'String')) returns contents of edit_inputsuffix as a double


% --- Executes during object creation, after setting all properties.
function edit_inputsuffix_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_inputsuffix (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_outputsuffix_Callback(hObject, eventdata, handles)
% hObject    handle to edit_outputsuffix (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_outputsuffix as text
%        str2double(get(hObject,'String')) returns contents of edit_outputsuffix as a double


% --- Executes during object creation, after setting all properties.
function edit_outputsuffix_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_outputsuffix (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_maxseetime_Callback(hObject, eventdata, handles)
% hObject    handle to edit_maxseetime (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_maxseetime as text
%        str2double(get(hObject,'String')) returns contents of edit_maxseetime as a double


% --- Executes during object creation, after setting all properties.
function edit_maxseetime_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_maxseetime (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_epochtimes_Callback(hObject, eventdata, handles)
% hObject    handle to edit_epochtimes (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_epochtimes as text
%        str2double(get(hObject,'String')) returns contents of edit_epochtimes as a double


% --- Executes during object creation, after setting all properties.
function edit_epochtimes_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_epochtimes (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_baselinetimes_Callback(hObject, eventdata, handles)
% hObject    handle to edit_baselinetimes (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_baselinetimes as text
%        str2double(get(hObject,'String')) returns contents of edit_baselinetimes as a double


% --- Executes during object creation, after setting all properties.
function edit_baselinetimes_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_baselinetimes (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on button press in check_event_sac.
function check_event_sac_Callback(hObject, eventdata, handles)
% hObject    handle to check_event_sac (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of check_event_sac


% --- Executes on button press in check_event_stim.
function check_event_stim_Callback(hObject, eventdata, handles)
% hObject    handle to check_event_stim (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of check_event_stim


% --- Executes on button press in check_event_vis.
function check_event_vis_Callback(hObject, eventdata, handles)
% hObject    handle to check_event_vis (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of check_event_vis


% --- Executes on button press in check_event_resp.
function check_event_resp_Callback(hObject, eventdata, handles)
% hObject    handle to check_event_resp (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of check_event_resp


% --- Executes on selection change in popup_baseevent.
function popup_baseevent_Callback(hObject, eventdata, handles)
% hObject    handle to popup_baseevent (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: contents = cellstr(get(hObject,'String')) returns popup_baseevent contents as cell array
%        contents{get(hObject,'Value')} returns selected item from popup_baseevent


% --- Executes during object creation, after setting all properties.
function popup_baseevent_CreateFcn(hObject, eventdata, handles)
% hObject    handle to popup_baseevent (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: popupmenu controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_t_win_epoch_Callback(hObject, eventdata, handles)
% hObject    handle to edit_t_win_epoch (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_t_win_epoch as text
%        str2double(get(hObject,'String')) returns contents of edit_t_win_epoch as a double


% --- Executes during object creation, after setting all properties.
function edit_t_win_epoch_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_t_win_epoch (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_t_win_saccade_Callback(hObject, eventdata, handles)
% hObject    handle to edit_t_win_saccade (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_t_win_saccade as text
%        str2double(get(hObject,'String')) returns contents of edit_t_win_saccade as a double


% --- Executes during object creation, after setting all properties.
function edit_t_win_saccade_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_t_win_saccade (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


% --- Executes on button press in check_incorrect.
function check_incorrect_Callback(hObject, eventdata, handles)
% hObject    handle to check_incorrect (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hint: get(hObject,'Value') returns toggle state of check_incorrect



function edit_saccade_range_Callback(hObject, eventdata, handles)
% hObject    handle to edit_saccade_range (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_saccade_range as text
%        str2double(get(hObject,'String')) returns contents of edit_saccade_range as a double


% --- Executes during object creation, after setting all properties.
function edit_saccade_range_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_saccade_range (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_experiment_Callback(hObject, eventdata, handles)
% hObject    handle to edit_experiment (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_experiment as text
%        str2double(get(hObject,'String')) returns contents of edit_experiment as a double


% --- Executes during object creation, after setting all properties.
function edit_experiment_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_experiment (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end



function edit_eegFilename_Callback(hObject, eventdata, handles)
% hObject    handle to edit_eegFilename (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_eegFilename as text
%        str2double(get(hObject,'String')) returns contents of edit_eegFilename as a double


% --- Executes during object creation, after setting all properties.
function edit_eegFilename_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_eegFilename (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end


function edit_newEegFilename_Callback(hObject, eventdata, handles)
% hObject    handle to edit_newEegFilename (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    structure with handles and user data (see GUIDATA)

% Hints: get(hObject,'String') returns contents of edit_newEegFilename as text
%        str2double(get(hObject,'String')) returns contents of edit_newEegFilename as a double


% --- Executes during object creation, after setting all properties.
function edit_newEegFilename_CreateFcn(hObject, eventdata, handles)
% hObject    handle to edit_newEegFilename (see GCBO)
% eventdata  reserved - to be defined in a future version of MATLAB
% handles    empty - handles not created until after all CreateFcns called

% Hint: edit controls usually have a white background on Windows.
%       See ISPC and COMPUTER.
if ispc && isequal(get(hObject,'BackgroundColor'), get(0,'defaultUicontrolBackgroundColor'))
    set(hObject,'BackgroundColor','white');
end
