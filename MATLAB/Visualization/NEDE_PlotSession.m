function NEDE_PlotSession(x)

% Plot positions of objects, camera, and lines of visibility.
% 
% NEDE_PlotSession(x)
%
% INPUTS:
% - x is a NEDE data struct imported using NEDE_ImportData.m.
%
% Created 1/23/14 by DJ.
% Updated 2/19/14 by DJ - added title & annotations to plot.

% Set up
isTarget = strcmpi({x.objects.tag},'TargetObject');
pos = cat(1,x.objects.position); % object positions
iVisible = unique(x.events.visible.object);

% Set up plot
cla;
hold on;
axis equal;

% Plot objects
plot(pos(isTarget,1),pos(isTarget,2),'r.');
plot(pos(~isTarget,1),pos(~isTarget,2),'b.');
% plot(pos(iVisible,1),pos(iVisible,3),'go','markersize',10);

% Plot camera position
plot(x.events.camera.position(:,1),x.events.camera.position(:,2),'k--')

% Plot visibility lines
for i=1:numel(iVisible)
    iVis1 = find(x.events.visible.object == iVisible(i),1,'first');
    iVis2 = find(x.events.visible.object == iVisible(i),1,'last');
    iPos1 = find(x.events.camera.time > x.events.visible.time(iVis1),1,'first');
    iPos2 = find(x.events.camera.time > x.events.visible.time(iVis2),1,'first');
    objPos = x.objects(iVisible(i)).position;
    plot([x.events.camera.position(iPos1,1), objPos(1), x.events.camera.position(iPos2,1)], ...
        [x.events.camera.position(iPos1,2), objPos(2), x.events.camera.position(iPos2,2)],'g');
end

% Annotate plot
title(x.params.EDF_filename,'Interpreter','none'); % show underscores, etc.
xlabel('x position');
ylabel('z position');
legend('targets','distractors','subject path','visibility');
box on