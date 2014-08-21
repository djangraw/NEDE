function hOut = NEDE_PlotEyeErps(eyeEpochs,objEpochs,epochTimes,isTargetEpoch,screen_res)

% Makes a figure/UI for scrolling through eye position data.
%
% hOut = NEDE_PlotEyeErps(eyeEpochs,objEpochs,epochTimes,isTargetEpoch,screen_res)
% hOut = NEDE_PlotEyeErps(experiment,subject,sessions,epoch_time_ms);
%
% The line represents the subject's eye position during the time inside the 
% time rectangle. The circle represents the subject's final eye position.  
% The big rectangle is the limits of the screen.
% The smaller rectangles represent the screen bounds of objects in the 
% scene, as reported by Unity.
%
% INPUTS:
%   - eye epochs, objEpochs, and epochTimes, and isTargetEpoch are the 
%   outputs of NEDE_GetEyeErps.
%   - screen_res is a 2-element vector indicating the width and height of
%   the screen.
%
% OUTPUTS:
%   - hOut is a struct containing the handles for various items on the
%   figure.  It can be used to get or change properties of the figures.
%   For example, type 'get(h.TargPlot)' to get the properties of the main 
%   movie.
%
% Created 3/28/11 by DJ.
% Updated 4/1/11 by DJ - get input from GetEyeErps.m
% Updated 5/9/13 by DJ - flipped y axis (0 at the top!)
% Updated 1/27/14 by DJ - adapted to NEDE version.

% Parse Subject/Sessions input format
if ischar(eyeEpochs)
    experiment = eyeEpochs;
    subject = objEpochs;
    sessions = epochTimes;
    epoch_time_ms = isTargetEpoch;
    [eE,oE,iTE] = deal(cell(1,numel(sessions)));
    for i=1:numel(sessions)
        fprintf('Processing session %d/%d...\n',i,numel(sessions));
        load(sprintf('%s-%d-%d.mat',experiment,subject,sessions(i)));
        [eE{i},oE{i},iTE{i}] = NEDE_GetEyeErps(x.events.fixupdate.position,x.events.fixupdate.time,x,epoch_time_ms);
        eS{i} = repmat(sessions(i),size(eE{i},1),1);
        eT{i} = (1:size(eE{i},1))';
    end
    eyeEpochs = cat(1,eE{:});
    objEpochs = cat(1,oE{:});
    isTargetEpoch = cat(1,iTE{:});
    epochTimes = epoch_time_ms;  
    epochSessions = cat(1,eS{:});
    epochTrials = cat(1,eT{:});
    screen_res = [x.params.screen.width, x.params.screen.height];
    disp('Done!')
else
    epochSessions = nan(size(eyeEpochs,1),1);
    epochTrials = 1:size(eyeEpochs,1);
end    

% declare default
if nargin<5 || isempty(screen_res)
    screen_res = [1024, 768];
end

% -------- INITIAL PLOTTING -------- %
disp('Setting up figure...');
figure; % make a new figure
% global iStart iEnd; % the global index of the current time point - this is used throughout all functions
iStart = 1; 
iEnd = 2;
tStart = epochTimes(iStart);
tEnd = epochTimes(iEnd);

% Main eye plots
h.TargPlot = axes('Units','normalized','Position',[0.13 0.3 0.35 0.65],'ydir','reverse'); % set position
rectangle('Position',[0 0 screen_res]);
title('Target Trials');
h.DistPlot = axes('Units','normalized','Position',[0.53 0.3 0.35 0.65],'ydir','reverse'); % set position
rectangle('Position',[0 0 screen_res]);
title('Distractor Trials');
axis(h.TargPlot,[-200 screen_res(1)+200 -200 screen_res(2)+200]);
axis(h.DistPlot,[-200 screen_res(1)+200 -200 screen_res(2)+200]);

% -------- TIME SELECTION PLOT SETUP -------- %
% 'Time plot' for selecting and observing current time
h.Time = axes('Units','normalized','Position',[0.13 0.1 0.775 0.1],'Yticklabel','','ButtonDownFcn',@time_callback); % set position
% set(h.Time,'Xticklabel',get(gca,'XTick'));
hold on;
% Annotate plot
xlim([epochTimes(1) epochTimes(end)]);
xlabel('time (ms)');
% h.Rect = rectangle('Position',[iStart,
% min(get(h.Time,'YLim')),iEnd-iStart,range(get(h.Time,'YLim'))],'facecolor','c','ButtonDownFcn',@time_callback); % Line indicating current time
plot([0 0],get(gca,'YLim'),'k','ButtonDownFcn',@time_callback);
h.Rect = imrect(h.Time,[tStart, min(get(h.Time,'YLim')),tEnd-tStart,range(get(h.Time,'YLim'))],...
    'PositionConstraintFcn',@roi_constraint);
addNewPositionCallback(h.Rect,@roi_callback); % Line indicating current time
set(h.Time,'ButtonDownFcn',@time_callback); % this must be called after plotting, or it will be overwritten
title('Drag rectangle to set limits of plot')

% Make GUI-like struct
h.eyeEpochs = eyeEpochs;
h.objEpochs = objEpochs;
h.epochTimes = epochTimes;
h.isTargetEpoch = isTargetEpoch;
h.epochSessions = epochSessions;
h.epochTrials = epochTrials;
h.screen_res = screen_res;
h.iStart = iStart;
h.iEnd = iEnd;
set(gcf,'UserData',h); % attach data to figure
hOut = h;
disp('Done!')
end %function NEDE_PlotEyeErps
    
% -------- SUBFUNCTIONS -------- %
function redraw() % Update the lines and rectangles

    % unpack data
    h = get(gcf,'UserData');
    epochTimes = h.epochTimes;
    screen_res = h.screen_res;  
    tStart = epochTimes(h.iStart); % start of epoch
    tEnd = epochTimes(h.iEnd); % end of epoch
    
    % Check that times are within allowable bounds
    if tStart<epochTimes(1), tStart = epochTimes(1); end
    if tEnd>epochTimes(end), tEnd = epochTimes(end); end
    if tEnd<=tStart, tEnd = tStart+1; end
    
    % unpack and crop target data
    tEye = h.eyeEpochs(h.isTargetEpoch,(h.iStart:h.iEnd));
    tObj = h.objEpochs(h.isTargetEpoch,(h.iStart:h.iEnd));
    tSess = h.epochSessions(h.isTargetEpoch);
    tTrial = h.epochTrials(h.isTargetEpoch);
    % unpack and crop distractor data
    dEye = h.eyeEpochs(~h.isTargetEpoch,(h.iStart:h.iEnd));
    dObj = h.objEpochs(~h.isTargetEpoch,(h.iStart:h.iEnd));
    dSess = h.epochSessions(~h.isTargetEpoch);
    dTrial = h.epochTrials(~h.isTargetEpoch);
    
    % Adjust plots
    title(h.Time,sprintf('From t=%.1f to t=%.1f ms',tStart,tEnd));
    
    % Plot lines for target and distractor trials
    axes(h.TargPlot); cla; hold on;   
    for i=1:size(tEye,1) % for each target trial
        % plot object position
        trialObjEnd = tObj{i,end};
        if ~isempty(trialObjEnd) && all(trialObjEnd(3:4)>0)
            rectangle('Position',[trialObjEnd],'EdgeColor','k');
        end
        % plot eye position
        trialEye = [tEye{i,:}];
        plot(trialEye(1,:),trialEye(2,:),'r-','UserData',...
            sprintf('clicked target trial %d (session %d, trial %d)',i,tSess(i),tTrial(i)),...
            'ButtonDownFcn','disp(get(gco,''UserData''))');
        plot(trialEye(1,end),trialEye(2,end),'ro','UserData',...
            sprintf('clicked target trial %d (session %d, trial %d)',i,tSess(i),tTrial(i)),...
            'ButtonDownFcn','disp(get(gco,''UserData''))');
    end
    rectangle('Position',[0 0 screen_res]);
    
    axes(h.DistPlot); cla; hold on;
    for i=1:size(dEye,1) % for each distractor trial
        % plot object position
        trialObjEnd = dObj{i,end};
        if ~isempty(trialObjEnd)
            rectangle('Position',[trialObjEnd],'EdgeColor','k');
        end
        % plot eye position
        trialEye = [dEye{i,:}];
        plot(trialEye(1,:),trialEye(2,:),'b-','UserData',...
            sprintf('clicked distractor trial %d (session %d, trial %d)',i,dSess(i),dTrial(i)),...
            'ButtonDownFcn','disp(get(gco,''UserData''))');
        plot(trialEye(1,end),trialEye(2,end),'bo','UserData',...
            sprintf('clicked distractor trial %d (session %d, trial %d)',i,dSess(i),dTrial(i)),...
            'ButtonDownFcn','disp(get(gco,''UserData''))');
    end
    rectangle('Position',[0 0 screen_res]);
end


function new_position = roi_constraint(current_position) % First mouse click on the Time plot brings us here
    % constrain position
    h = get(gcf,'UserData');
    xStart = max(current_position(1), min(get(h.Time,'XLim'))+1); % not too early
    xStart = min(xStart, max(get(h.Time,'XLim'))-current_position(3)); % not too late
    new_position = [xStart, min(get(h.Time,'YLim')), current_position(3), range(get(h.Time,'YLim'))];
end

function roi_callback(current_position)
    % get time points
    h = get(gcf,'UserData');
    iStart = find(h.epochTimes>=current_position(1),1);
    iEnd = find(h.epochTimes>=current_position(1)+current_position(3),1);    
    % Update userdata
    h.iStart = iStart;
    h.iEnd = iEnd;
    set(gcf,'UserData',h);
    % update lines and rectangles
    redraw; 
end   

function time_callback(hObject,eventdata) % First mouse click on the Time plot brings us here

end    






