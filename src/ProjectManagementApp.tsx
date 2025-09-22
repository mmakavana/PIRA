import React, { useState, useRef } from 'react';
import { Users, Plus, X, Settings, BarChart3, Calendar, Trash2 } from 'lucide-react';

// Simple input that manages its own state completely
const SimpleInput = React.memo(({ initialValue, onSubmit, placeholder, className, type = "text" }) => {
  const inputRef = useRef(null);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit(e.target.value);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      defaultValue={initialValue || ''}
      placeholder={placeholder}
      className={className}
      onKeyDown={handleKeyDown}
    />
  );
});

const ProjectManagementApp = () => {
  // Core state management
  const [activeTab, setActiveTab] = useState('unified');
  const [teams, setTeams] = useState([
    { id: 1, name: 'Development', members: ['John', 'Sarah', 'Mike'] },
    { id: 2, name: 'QA', members: ['Lisa', 'Tom'] },
    { id: 3, name: 'DevOps', members: ['Alex', 'Emma'] }
  ]);
  const [projects, setProjects] = useState([]);
  
  // Timeline view settings - per tab
  const [timelineSettings, setTimelineSettings] = useState(() => {
    const defaultStart = new Date();
    defaultStart.setMonth(defaultStart.getMonth() - 1);
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 6);
    
    return {
      unified: { view: 'weeks', startDate: defaultStart, endDate: defaultEnd, executiveMode: false },
      ...teams.reduce((acc, team) => {
        acc[team.name.toLowerCase().replace(/\s+/g, '-')] = { 
          view: 'weeks', 
          startDate: new Date(defaultStart), 
          endDate: new Date(defaultEnd),
          executiveMode: false
        };
        return acc;
      }, {})
    };
  });
  
  // Project management
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState({});
  const [editingMemberName, setEditingMemberName] = useState({});
  
  // Update timeline settings for a specific tab
  const updateTimelineSettings = (tabId, updates) => {
    setTimelineSettings(prev => ({
      ...prev,
      [tabId]: { ...prev[tabId], ...updates }
    }));
  };

  // Get current timeline settings for active tab
  const getCurrentTimelineSettings = () => {
    return timelineSettings[activeTab] || timelineSettings.unified;
  };

  // Status options
  const statusOptions = [
    { name: 'In Progress', color: '#3B82F6' },
    { name: 'Stabilization', color: '#F59E0B' },
    { name: 'On Hold', color: '#EF4444' },
    { name: 'Complete', color: '#10B981' }
  ];

  // Shape and color options for milestones
  const shapeOptions = ['diamond', 'circle', 'triangle', 'square', 'star'];
  const colorOptions = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F43F5E', // Rose
    '#A855F7', // Violet
    '#22C55E', // Emerald
    '#EAB308', // Yellow
    '#64748B', // Slate
    '#78716C', // Stone
    '#DC2626', // Red-600
    '#059669', // Emerald-600
    '#7C3AED', // Violet-600
    '#DB2777', // Pink-600
    '#0891B2', // Cyan-600
    '#65A30D', // Lime-600
    '#EA580C', // Orange-600
    '#4F46E5', // Indigo-600
    '#0D9488', // Teal-600
    '#BE185D', // Pink-700
    '#7C2D12', // Orange-900
    '#1E293B', // Slate-800
    '#374151'  // Gray-700
  ];

  // Update team name
  const updateTeamName = (teamId, newName) => {
    if (newName.trim()) {
      setTeams(teams.map(team => 
        team.id === teamId 
          ? { ...team, name: newName.trim() }
          : team
      ));
      setEditingTeamName(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // Update member name
  const updateMemberName = (teamId, oldName, newName) => {
    if (newName.trim()) {
      setTeams(teams.map(team => 
        team.id === teamId 
          ? { 
              ...team, 
              members: team.members.map(member => 
                member === oldName ? newName.trim() : member
              ) 
            }
          : team
      ));
      setEditingMemberName(prev => ({ ...prev, [`${teamId}-${oldName}`]: false }));
    }
  };

  // Generate team tabs dynamically
  const teamTabs = teams.map(team => ({
    id: team.name.toLowerCase().replace(/\s+/g, '-'),
    label: team.name,
    teamId: team.id
  }));

  // Add new team
  const addTeam = (teamName) => {
    if (teamName && teamName.trim()) {
      const newTeam = {
        id: Date.now(),
        name: teamName.trim(),
        members: []
      };
      setTeams(prev => [...prev, newTeam]);
      
      // Add timeline settings for new team
      const tabId = teamName.trim().toLowerCase().replace(/\s+/g, '-');
      const defaultStart = new Date();
      defaultStart.setMonth(defaultStart.getMonth() - 1);
      const defaultEnd = new Date();
      defaultEnd.setMonth(defaultEnd.getMonth() + 6);
      
      setTimelineSettings(prev => ({
        ...prev,
        [tabId]: {
          view: 'weeks',
          startDate: defaultStart,
          endDate: defaultEnd,
          executiveMode: false
        }
      }));
    }
  };

  // Delete team
  const deleteTeam = (teamId) => {
    setTeams(teams.filter(team => team.id !== teamId));
  };

  // Add member to team
  const addMemberToTeam = (teamId, memberName) => {
    if (memberName && memberName.trim()) {
      setTeams(teams.map(team => 
        team.id === teamId 
          ? { ...team, members: [...team.members, memberName.trim()] }
          : team
      ));
    }
  };

  // Remove member from team
  const removeMemberFromTeam = (teamId, memberName) => {
    setTeams(teams.map(team => 
      team.id === teamId 
        ? { ...team, members: team.members.filter(member => member !== memberName) }
        : team
    ));
  };

  // Get all members across all teams
  const getAllMembers = () => {
    return teams.flatMap(team => 
      team.members.map(member => ({
        name: member,
        teamId: team.id,
        teamName: team.name
      }))
    );
  };

  const generateTimelineColumns = (settings = null) => {
    const currentSettings = settings || getCurrentTimelineSettings();
    const { view: timelineView, startDate: timelineStartDate, endDate: timelineEndDate } = currentSettings;
    
    const columns = [];
    const start = new Date(timelineStartDate);
    const end = new Date(timelineEndDate);
    
    if (timelineView === 'days') {
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        columns.push({
          date: new Date(date),
          label: date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
          width: 30
        });
      }
    } else if (timelineView === 'weeks') {
      const startOfWeek = new Date(start);
      startOfWeek.setDate(start.getDate() - start.getDay());
      
      for (let date = new Date(startOfWeek); date <= end; date.setDate(date.getDate() + 7)) {
        columns.push({
          date: new Date(date),
          label: date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
          width: 80
        });
      }
    } else { // months
      for (let date = new Date(start.getFullYear(), start.getMonth(), 1); date <= end; date.setMonth(date.getMonth() + 1)) {
        columns.push({
          date: new Date(date),
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          width: 120
        });
      }
    }
    return columns;
  };

  const calculateTodayPosition = (columns) => {
    if (!columns.length) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timelineStart = columns[0]?.date || today;
    const timelineEnd = columns[columns.length - 1]?.date || today;
    
    if (today < timelineStart || today > timelineEnd) return null;
    
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
    const todayOffset = today.getTime() - timelineStart.getTime();
    
    return totalDuration > 0 ? (todayOffset / totalDuration) * 100 : 0;
  };

  const calculateProjectPosition = (project, columns) => {
    if (!columns.length) return { left: '0%', width: '2%' };
    
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.dueDate);
    const timelineStart = new Date(columns[0].date);
    const timelineEnd = new Date(columns[columns.length - 1].date);
    
    // Ensure we have valid dates
    if (!startDate.getTime() || !endDate.getTime()) {
      return { left: '0%', width: '2%' };
    }
    
    const totalTimespan = timelineEnd.getTime() - timelineStart.getTime();
    
    if (totalTimespan <= 0) {
      return { left: '0%', width: '2%' };
    }
    
    // Calculate position relative to timeline
    const projectStartOffset = startDate.getTime() - timelineStart.getTime();
    const projectDuration = endDate.getTime() - startDate.getTime();
    
    // Convert to percentages
    const leftPercent = Math.max(0, (projectStartOffset / totalTimespan) * 100);
    const widthPercent = Math.max(1, (projectDuration / totalTimespan) * 100);
    
    // Ensure the bar doesn't extend beyond the visible timeline
    const maxWidth = Math.min(widthPercent, 100 - leftPercent);
    
    return { 
      left: `${leftPercent}%`, 
      width: `${Math.max(1, maxWidth)}%`
    };
  };

  const renderShape = (shape, color, size = 12) => {
    const shapeProps = {
      width: size,
      height: size,
      fill: color,
      stroke: '#000',
      strokeWidth: 1
    };

    switch (shape) {
      case 'diamond':
        return (
          <svg width={size} height={size} className="inline-block">
            <polygon points={`${size/2},2 ${size-2},${size/2} ${size/2},${size-2} 2,${size/2}`} {...shapeProps} />
          </svg>
        );
      case 'circle':
        return (
          <svg width={size} height={size} className="inline-block">
            <circle cx={size/2} cy={size/2} r={size/2-1} {...shapeProps} />
          </svg>
        );
      case 'triangle':
        return (
          <svg width={size} height={size} className="inline-block">
            <polygon points={`${size/2},2 ${size-2},${size-2} 2,${size-2}`} {...shapeProps} />
          </svg>
        );
      case 'square':
        return (
          <svg width={size} height={size} className="inline-block">
            <rect x="2" y="2" width={size-4} height={size-4} {...shapeProps} />
          </svg>
        );
      case 'star':
        return (
          <svg width={size} height={size} className="inline-block">
            <polygon points={`${size/2},2 ${size*0.6},${size*0.4} ${size-2},${size*0.4} ${size*0.7},${size*0.65} ${size*0.8},${size-2} ${size/2},${size*0.75} ${size*0.2},${size-2} ${size*0.3},${size*0.65} 2,${size*0.4} ${size*0.4},${size*0.4}`} {...shapeProps} />
          </svg>
        );
      default:
        return <div style={{width: size, height: size, backgroundColor: color, borderRadius: '50%'}} className="inline-block" />;
    }
  };

  // Add/Update project from form
  const saveProjectFromForm = () => {
    const form = document.getElementById('projectForm');
    const formData = new FormData(form);
    
    const projectData = {
      id: editingProject ? editingProject.id : Date.now(),
      name: formData.get('name'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      startDate: formData.get('startDate'),
      dueDate: formData.get('dueDate'),
      stabilizationDate: formData.get('stabilizationDate'),
      completionDate: formData.get('completionDate'),
      status: formData.get('status'),
      assignedMembers: formData.getAll('assignedMembers'),
      // Visual settings
      projectColor: formData.get('projectColor') || '#3B82F6',
      startDateShape: formData.get('startDateShape') || 'diamond',
      startDateColor: formData.get('startDateColor') || '#10B981',
      dueDateShape: formData.get('dueDateShape') || 'diamond', 
      dueDateColor: formData.get('dueDateColor') || '#EF4444',
      // Milestones
      milestones: editingProject ? editingProject.milestones || [] : [],
      dueDateHistory: editingProject ? editingProject.dueDateHistory : [
        { date: formData.get('dueDate'), changedOn: new Date().toISOString(), reason: 'Initial date' }
      ]
    };

    if (!projectData.name || !projectData.startDate || !projectData.dueDate) {
      alert('Please fill in required fields: Name, Start Date, and Due Date');
      return;
    }

    if (editingProject) {
      setProjects(projects.map(p => p.id === editingProject.id ? projectData : p));
    } else {
      setProjects(prev => [...prev, projectData]);
    }

    setShowAddProject(false);
    setEditingProject(null);
    form.reset();
  };

  // Add milestone to project
  const addMilestone = (projectId, milestone) => {
    setProjects(projects.map(project => 
      project.id === projectId 
        ? { 
            ...project, 
            milestones: [...(project.milestones || []), { 
              id: Date.now(), 
              ...milestone 
            }] 
          }
        : project
    ));
  };

  // Remove milestone from project
  const removeMilestone = (projectId, milestoneId) => {
    setProjects(projects.map(project => 
      project.id === projectId 
        ? { 
            ...project, 
            milestones: (project.milestones || []).filter(m => m.id !== milestoneId) 
          }
        : project
    ));
  };

  // Delete project
  const deleteProject = (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      setProjects(projects.filter(p => p.id !== projectId));
    }
  };

  // Start editing project
  const startEditProject = (project) => {
    setEditingProject(project);
    setShowAddProject(true);
  };

  // Team Management Component
  const TeamManagement = () => (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
      </div>

      {/* Add New Team */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add New Team
        </h3>
        <div className="flex gap-3">
          <SimpleInput
            placeholder="Team name"
            onSubmit={addTeam}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[placeholder="Team name"]');
              if (input && input.value.trim()) {
                addTeam(input.value);
                input.value = '';
              }
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Team
          </button>
        </div>
      </div>

      {/* Teams List */}
      <div className="grid gap-6">
        {teams.map(team => (
          <div key={team.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              {editingTeamName[team.id] ? (
                <input
                  type="text"
                  defaultValue={team.name}
                  onBlur={(e) => updateTeamName(team.id, e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      updateTeamName(team.id, e.target.value);
                    }
                    if (e.key === 'Escape') {
                      setEditingTeamName(prev => ({ ...prev, [team.id]: false }));
                    }
                  }}
                  className="text-lg font-semibold text-gray-800 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <h3 
                  className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                  onClick={() => setEditingTeamName(prev => ({ ...prev, [team.id]: true }))}
                  title="Click to edit team name"
                >
                  {team.name}
                </h3>
              )}
              <button
                onClick={() => deleteTeam(team.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Delete Team"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Team Members */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 mb-2">Members:</h4>
              <div className="flex flex-wrap gap-2">
                {team.members.map(member => (
                  <span
                    key={member}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {editingMemberName[`${team.id}-${member}`] ? (
                      <input
                        type="text"
                        defaultValue={member}
                        onBlur={(e) => updateMemberName(team.id, member, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            updateMemberName(team.id, member, e.target.value);
                          }
                          if (e.key === 'Escape') {
                            setEditingMemberName(prev => ({ ...prev, [`${team.id}-${member}`]: false }));
                          }
                        }}
                        className="bg-white border border-gray-300 rounded px-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span 
                        className="cursor-pointer hover:text-blue-900"
                        onClick={() => setEditingMemberName(prev => ({ ...prev, [`${team.id}-${member}`]: true }))}
                        title="Click to edit member name"
                      >
                        {member}
                      </span>
                    )}
                    <button
                      onClick={() => removeMemberFromTeam(team.id, member)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {team.members.length === 0 && (
                  <span className="text-gray-500 italic">No members assigned</span>
                )}
              </div>
            </div>

            {/* Add Member */}
            <div className="flex gap-3">
              <SimpleInput
                placeholder="New member name"
                onSubmit={(value) => addMemberToTeam(team.id, value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  const input = event.target.closest('.flex').querySelector('input[placeholder="New member name"]');
                  if (input && input.value.trim()) {
                    addMemberToTeam(team.id, input.value.trim());
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Project Management Component
  const ProjectManagement = () => (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Project Management</h2>
        <button
          onClick={() => setShowAddProject(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Add/Edit Project Form */}
      {showAddProject && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </h3>
          
          <form id="projectForm" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                name="name"
                type="text"
                defaultValue={editingProject?.name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project name"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <input
                name="priority"
                type="number"
                defaultValue={editingProject?.priority || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 1, 2, 3..."
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                name="startDate"
                type="date"
                defaultValue={editingProject?.startDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                name="dueDate"
                type="date"
                defaultValue={editingProject?.dueDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Stabilization Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stabilization Date
              </label>
              <input
                name="stabilizationDate"
                type="date"
                defaultValue={editingProject?.stabilizationDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Completion Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Date
              </label>
              <input
                name="completionDate"
                type="date"
                defaultValue={editingProject?.completionDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                defaultValue={editingProject?.status || 'In Progress'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(status => (
                  <option key={status.name} value={status.name}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Members
              </label>
              <select
                name="assignedMembers"
                multiple
                defaultValue={editingProject?.assignedMembers || []}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              >
                {getAllMembers().map(member => (
                  <option key={`${member.teamId}-${member.name}`} value={member.name}>
                    {member.name} ({member.teamName})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple members</p>
            </div>

            {/* Project Bar Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Bar Color
              </label>
              <select
                name="projectColor"
                defaultValue={editingProject?.projectColor || '#3B82F6'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {colorOptions.map(color => (
                  <option key={color} value={color} style={{ backgroundColor: color, color: 'white' }}>
                    {color}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Marker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date Marker
              </label>
              <div className="flex gap-2">
                <select
                  name="startDateShape"
                  defaultValue={editingProject?.startDateShape || 'diamond'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {shapeOptions.map(shape => (
                    <option key={shape} value={shape}>
                      {shape.charAt(0).toUpperCase() + shape.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  name="startDateColor"
                  defaultValue={editingProject?.startDateColor || '#10B981'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {colorOptions.map(color => (
                    <option key={color} value={color} style={{ backgroundColor: color, color: 'white' }}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date Marker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date Marker
              </label>
              <div className="flex gap-2">
                <select
                  name="dueDateShape"
                  defaultValue={editingProject?.dueDateShape || 'diamond'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {shapeOptions.map(shape => (
                    <option key={shape} value={shape}>
                      {shape.charAt(0).toUpperCase() + shape.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  name="dueDateColor"
                  defaultValue={editingProject?.dueDateColor || '#EF4444'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {colorOptions.map(color => (
                    <option key={color} value={color} style={{ backgroundColor: color, color: 'white' }}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description - Full Width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                defaultValue={editingProject?.description || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter project description"
              />
            </div>

            {/* Milestones Section - Full Width */}
            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Milestones
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt('Milestone name:');
                    const date = prompt('Milestone date (YYYY-MM-DD):');
                    if (name && date) {
                      const newMilestone = {
                        id: Date.now(),
                        name,
                        date,
                        shape: 'diamond',
                        color: '#F59E0B'
                      };
                      
                      if (editingProject) {
                        // Update existing project
                        const updatedProject = {
                          ...editingProject,
                          milestones: [...(editingProject.milestones || []), newMilestone]
                        };
                        setEditingProject(updatedProject);
                        setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                      }
                    }
                  }}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Add Milestone
                </button>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {((editingProject?.milestones) || []).map(milestone => (
                  <div key={milestone.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={milestone.name}
                        onChange={(e) => {
                          const updatedMilestones = editingProject.milestones.map(m =>
                            m.id === milestone.id ? { ...m, name: e.target.value } : m
                          );
                          const updatedProject = { ...editingProject, milestones: updatedMilestones };
                          setEditingProject(updatedProject);
                          setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                        }}
                        className="font-medium text-sm px-2 py-1 border rounded"
                      />
                      <input
                        type="date"
                        value={milestone.date}
                        onChange={(e) => {
                          const updatedMilestones = editingProject.milestones.map(m =>
                            m.id === milestone.id ? { ...m, date: e.target.value } : m
                          );
                          const updatedProject = { ...editingProject, milestones: updatedMilestones };
                          setEditingProject(updatedProject);
                          setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                        }}
                        className="text-sm px-2 py-1 border rounded"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs">Shape:</span>
                        <select
                          value={milestone.shape}
                          onChange={(e) => {
                            const updatedMilestones = editingProject.milestones.map(m =>
                              m.id === milestone.id ? { ...m, shape: e.target.value } : m
                            );
                            const updatedProject = { ...editingProject, milestones: updatedMilestones };
                            setEditingProject(updatedProject);
                            setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                          }}
                          className="text-xs px-1 py-0 border rounded"
                        >
                          {shapeOptions.map(shape => (
                            <option key={shape} value={shape}>{shape}</option>
                          ))}
                        </select>
                        <select
                          value={milestone.color}
                          onChange={(e) => {
                            const updatedMilestones = editingProject.milestones.map(m =>
                              m.id === milestone.id ? { ...m, color: e.target.value } : m
                            );
                            const updatedProject = { ...editingProject, milestones: updatedMilestones };
                            setEditingProject(updatedProject);
                            setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                          }}
                          className="text-xs px-1 py-0 border rounded"
                        >
                          {colorOptions.map(color => (
                            <option key={color} value={color} style={{ backgroundColor: color, color: 'white' }}>
                              {color}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedMilestones = editingProject.milestones.filter(m => m.id !== milestone.id);
                        const updatedProject = { ...editingProject, milestones: updatedMilestones };
                        setEditingProject(updatedProject);
                        setProjects(projects.map(p => p.id === editingProject.id ? updatedProject : p));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowAddProject(false);
                setEditingProject(null);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveProjectFromForm}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              {editingProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">All Projects</h3>
        </div>
        
        {projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No projects created yet.</p>
            <button
              onClick={() => setShowAddProject(true)}
              className="mt-2 text-blue-500 hover:text-blue-700 font-medium"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {projects.map(project => {
              const statusColor = statusOptions.find(s => s.name === project.status)?.color || '#6B7280';
              return (
                <div key={project.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-800">{project.name}</h4>
                        {project.priority && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded">
                            Priority: {project.priority}
                          </span>
                        )}
                        <span 
                          className="px-2 py-1 text-white text-sm rounded"
                          style={{ backgroundColor: statusColor }}
                        >
                          {project.status}
                        </span>
                      </div>
                      
                      {project.description && (
                        <p className="text-gray-600 mb-2">{project.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                        <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                        <span>Due: {new Date(project.dueDate).toLocaleDateString()}</span>
                        {project.stabilizationDate && (
                          <span>Stabilization: {new Date(project.stabilizationDate).toLocaleDateString()}</span>
                        )}
                        {project.completionDate && (
                          <span>Completed: {new Date(project.completionDate).toLocaleDateString()}</span>
                        )}
                      </div>
                      
                      {project.assignedMembers.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-sm text-gray-500">Assigned:</span>
                          {project.assignedMembers.map(member => {
                            const memberData = getAllMembers().find(m => m.name === member);
                            return (
                              <span 
                                key={member}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                              >
                                {member}
                                {memberData && (
                                  <span className="text-blue-600"> ({memberData.teamName})</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditProject(project)}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title="Edit Project"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Legend Component
  const LegendEditor = ({ tabId = 'unified' }) => {
    const [milestoneTypes, setMilestoneTypes] = useState([
      { id: 'start', name: 'Start Date', color: '#10B981', shape: 'diamond', size: 'small' },
      { id: 'due', name: 'Due Date', color: '#EF4444', shape: 'diamond', size: 'small' },
      { id: 'stabilization', name: 'Stabilization', color: '#3B82F6', shape: 'diamond', size: 'medium' },
      { id: 'complete', name: 'Complete', color: '#10B981', shape: 'diamond', size: 'medium' }
    ]);

    const addMilestoneType = () => {
      const newType = {
        id: Date.now(),
        name: 'New Milestone',
        color: '#F59E0B',
        shape: 'diamond',
        size: 'small'
      };
      setMilestoneTypes(prev => [...prev, newType]);
    };

    const updateMilestoneType = (id, updates) => {
      setMilestoneTypes(prev => prev.map(type => 
        type.id === id ? { ...type, ...updates } : type
      ));
    };

    const deleteMilestoneType = (id) => {
      setMilestoneTypes(prev => prev.filter(type => type.id !== id));
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">Legend: Milestone Types</h3>
        
        {/* Today Line Control */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium">Today:</span>
            <input 
              type="date" 
              defaultValue={new Date().toISOString().split('T')[0]}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
              Apply
            </button>
          </label>
          <span className="text-sm text-gray-500">Controls the vertical black "today" line on the chart.</span>
        </div>

        {/* Milestone Types */}
        <div className="space-y-3">
          {milestoneTypes.map(type => (
            <div key={type.id} className="flex items-center gap-4 p-2 border rounded">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium w-20">Name</span>
                <input
                  type="text"
                  value={type.name}
                  onChange={(e) => updateMilestoneType(type.id, { name: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Color</span>
                <div 
                  className="w-6 h-4 border rounded cursor-pointer"
                  style={{ backgroundColor: type.color }}
                  onClick={() => {
                    const newColor = prompt('Enter hex color:', type.color);
                    if (newColor) updateMilestoneType(type.id, { color: newColor });
                  }}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Shape</span>
                <select
                  value={type.shape}
                  onChange={(e) => updateMilestoneType(type.id, { shape: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  {shapeOptions.map(shape => (
                    <option key={shape} value={shape}>{shape}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Size</span>
                <select
                  value={type.size}
                  onChange={(e) => updateMilestoneType(type.id, { size: e.target.value })}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="small">small</option>
                  <option value="medium">medium</option>
                  <option value="large">large</option>
                </select>
              </div>
              
              <button
                onClick={() => deleteMilestoneType(type.id)}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        
        <button
          onClick={addMilestoneType}
          className="mt-3 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          + Add Type
        </button>
      </div>
    );
  };

  // Unified View Component
  const UnifiedView = () => {
    const settings = getCurrentTimelineSettings();
    const columns = generateTimelineColumns(settings);
    const todayPosition = calculateTodayPosition(columns);

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Unified Project Timeline</h2>
          
          {/* Timeline Controls */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.executiveMode}
                onChange={(e) => updateTimelineSettings('unified', { executiveMode: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">Executive Mode</span>
            </label>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">View:</label>
              <select 
                value={settings.view} 
                onChange={(e) => updateTimelineSettings('unified', { view: e.target.value })}
                className="px-3 py-1 border border-gray-300 rounded-md"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">From:</label>
              <input 
                type="date" 
                value={settings.startDate.toISOString().split('T')[0]}
                onChange={(e) => updateTimelineSettings('unified', { startDate: new Date(e.target.value) })}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">To:</label>
              <input 
                type="date" 
                value={settings.endDate.toISOString().split('T')[0]}
                onChange={(e) => updateTimelineSettings('unified', { endDate: new Date(e.target.value) })}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* Legend Editor */}
        <LegendEditor tabId="unified" />

        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            <p>No projects to display.</p>
            <button
              onClick={() => setActiveTab('projects')}
              className="mt-2 text-blue-500 hover:text-blue-700 font-medium"
            >
              Add your first project
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Header */}
            <div className="border-b bg-gray-50 p-4">
              <div className="flex">
                <div className="w-64 font-medium">All Projects</div>
                <div className="flex-1 relative">
                  <div className="flex border-l">
                    {columns.map((col, index) => (
                      <div 
                        key={index} 
                        className="border-r border-gray-200 text-center text-xs font-medium py-2"
                        style={{ minWidth: `${col.width}px` }}
                      >
                        {col.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Projects */}
            <div className="divide-y divide-gray-200">
              {projects.map((project, index) => {
                const position = calculateProjectPosition(project, columns);
                const statusColor = statusOptions.find(s => s.name === project.status)?.color || '#6B7280';
                
                return (
                  <div key={project.id} className="flex items-center hover:bg-gray-50">
                    <div className="w-64 p-4">
                      <div className="text-sm font-medium">
                        {settings.executiveMode ? `Project ${index + 1}` : project.name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        {project.priority && <span>P{project.priority}</span>}
                        <span 
                          className="px-1 py-0 text-white rounded text-xs"
                          style={{ backgroundColor: statusColor }}
                        >
                          {project.status}
                        </span>
                      </div>
                      {project.assignedMembers.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {settings.executiveMode 
                            ? `${project.assignedMembers.length} resource${project.assignedMembers.length !== 1 ? 's' : ''}`
                            : project.assignedMembers.slice(0, 2).join(', ') + (project.assignedMembers.length > 2 ? '...' : '')
                          }
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 relative h-12 border-l">
                      {/* Grid lines */}
                      {columns.map((col, colIndex) => (
                        <div 
                          key={colIndex}
                          className="absolute border-r border-gray-200 h-full"
                          style={{ left: `${(colIndex / columns.length) * 100}%` }}
                        />
                      ))}
                      
                      {/* Today line */}
                      {todayPosition !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                          style={{ left: `${todayPosition}%` }}
                          title={`Today: ${new Date().toLocaleDateString()}`}
                        />
                      )}
                      
                      {/* Project Bar */}
                      <div
                        className="absolute top-1/2 transform -translate-y-1/2 h-4 rounded flex items-center justify-between px-1 z-10"
                        style={{
                          left: position.left,
                          width: position.width,
                          backgroundColor: project.projectColor || '#3B82F6',
                          minWidth: '16px'
                        }}
                        title={`${project.name}: ${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.dueDate).toLocaleDateString()}`}
                      >
                        <div className="flex items-center">
                          {renderShape(project.startDateShape || 'diamond', project.startDateColor || '#10B981', 8)}
                        </div>
                        <div className="flex items-center">
                          {renderShape(project.dueDateShape || 'diamond', project.dueDateColor || '#EF4444', 8)}
                        </div>
                      </div>

                      {/* Milestones */}
                      {(project.milestones || []).map((milestone) => {
                        const milestoneDate = new Date(milestone.date);
                        const timelineStart = columns[0]?.date || new Date();
                        const timelineEnd = columns[columns.length - 1]?.date || new Date();
                        const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
                        const milestoneOffset = milestoneDate.getTime() - timelineStart.getTime();
                        const milestoneLeft = Math.max(0, Math.min(100, (milestoneOffset / totalDuration) * 100));

                        return (
                          <div
                            key={milestone.id}
                            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-20"
                            style={{ left: `${milestoneLeft}%` }}
                            title={`${milestone.name} - ${new Date(milestone.date).toLocaleDateString()}`}
                          >
                            {renderShape(milestone.shape, milestone.color, 12)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const TeamView = ({ teamId }) => {
    const team = teams.find(t => t.id === teamId);
    const teamProjects = projects.filter(project => 
      project.assignedMembers.some(member => 
        team?.members.includes(member)
      )
    );
    
    const tabId = team?.name.toLowerCase().replace(/\s+/g, '-');
    const settings = timelineSettings[tabId] || timelineSettings.unified;
    const columns = generateTimelineColumns(settings);
    const todayPosition = calculateTodayPosition(columns);

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{team?.name} Team Timeline</h2>
          
          {/* Timeline Controls */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.executiveMode}
                onChange={(e) => updateTimelineSettings(tabId, { executiveMode: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium">Executive Mode</span>
            </label>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">View:</label>
              <select 
                value={settings.view} 
                onChange={(e) => updateTimelineSettings(tabId, { view: e.target.value })}
                className="px-3 py-1 border border-gray-300 rounded-md"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">From:</label>
              <input 
                type="date" 
                value={settings.startDate.toISOString().split('T')[0]}
                onChange={(e) => updateTimelineSettings(tabId, { startDate: new Date(e.target.value) })}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">To:</label>
              <input 
                type="date" 
                value={settings.endDate.toISOString().split('T')[0]}
                onChange={(e) => updateTimelineSettings(tabId, { endDate: new Date(e.target.value) })}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        </div>

        {/* Legend Editor */}
        <LegendEditor tabId={tabId} />

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Team Members & Their Projects */}
          <div className="border-b bg-gray-50 p-4">
            <div className="flex">
              <div className="w-64 font-medium">Team Members</div>
              <div className="flex-1 relative">
                <div className="flex border-l">
                  {columns.map((col, index) => (
                    <div 
                      key={index} 
                      className="border-r border-gray-200 text-center text-xs font-medium py-2"
                      style={{ minWidth: `${col.width}px` }}
                    >
                      {col.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {team?.members.map((member, memberIndex) => {
              const memberProjects = teamProjects.filter(project => 
                project.assignedMembers.includes(member)
              );

              return (
                <div key={member}>
                  {/* Member Header */}
                  <div className="bg-blue-50 border-b border-blue-100">
                    <div className="flex">
                      <div className="w-64 p-3 font-medium text-blue-800">
                        {settings.executiveMode ? `Resource ${memberIndex + 1}` : member}
                        <span className="text-xs text-blue-600 block">
                          {memberProjects.length} project{memberProjects.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex-1 border-l border-blue-200"></div>
                    </div>
                  </div>

                  {/* Member's Projects */}
                  {memberProjects.length === 0 ? (
                    <div className="flex">
                      <div className="w-64 p-4"></div>
                      <div className="flex-1 p-4 text-gray-500 text-sm border-l">
                        No current projects assigned
                      </div>
                    </div>
                  ) : (
                    memberProjects.map((project, projectIndex) => {
                      const position = calculateProjectPosition(project, columns);
                      return (
                        <div key={project.id} className="flex items-center hover:bg-gray-50">
                          <div className="w-64 p-4 pl-8">
                            <div className="text-sm font-medium">
                              {settings.executiveMode ? `Project ${projectIndex + 1}` : project.name}
                            </div>
                            {project.priority && (
                              <div className="text-xs text-gray-500">Priority: {project.priority}</div>
                            )}
                            <div className="text-xs text-gray-500">
                              {new Date(project.startDate).toLocaleDateString()} - {new Date(project.dueDate).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="flex-1 relative h-12 border-l">
                            {/* Grid lines */}
                            {columns.map((col, index) => (
                              <div 
                                key={index}
                                className="absolute border-r border-gray-200 h-full"
                                style={{ left: `${(index / columns.length) * 100}%` }}
                              />
                            ))}
                            
                            {/* Today line */}
                            {todayPosition !== null && (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                                style={{ left: `${todayPosition}%` }}
                                title={`Today: ${new Date().toLocaleDateString()}`}
                              />
                            )}
                            
                            {/* Project Bar */}
                            <div
                              className="absolute top-1/2 transform -translate-y-1/2 h-4 rounded flex items-center justify-between px-1 z-10"
                              style={{
                                left: position.left,
                                width: position.width,
                                backgroundColor: project.projectColor || '#3B82F6',
                                minWidth: '16px'
                              }}
                              title={`${project.name}: ${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.dueDate).toLocaleDateString()}`}
                            >
                              <div className="flex items-center">
                                {renderShape(project.startDateShape || 'diamond', project.startDateColor || '#10B981', 8)}
                              </div>
                              <div className="flex items-center">
                                {renderShape(project.dueDateShape || 'diamond', project.dueDateColor || '#EF4444', 8)}
                              </div>
                            </div>

                            {/* Milestones */}
                            {(project.milestones || []).map((milestone) => {
                              const milestoneDate = new Date(milestone.date);
                              const timelineStart = columns[0]?.date || new Date();
                              const timelineEnd = columns[columns.length - 1]?.date || new Date();
                              const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
                              const milestoneOffset = milestoneDate.getTime() - timelineStart.getTime();
                              const milestoneLeft = Math.max(0, Math.min(100, (milestoneOffset / totalDuration) * 100));

                              return (
                                <div
                                  key={milestone.id}
                                  className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-20"
                                  style={{ left: `${milestoneLeft}%` }}
                                  title={`${milestone.name} - ${new Date(milestone.date).toLocaleDateString()}`}
                                >
                                  {renderShape(milestone.shape, milestone.color, 10)}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const Reports = () => (
    <div className="p-6 text-center">
      <h2 className="text-2xl font-bold mb-4">Reports & Analytics</h2>
      <p className="text-gray-600">Comprehensive reporting suite will be built in a later section.</p>
    </div>
  );

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'unified':
        return <UnifiedView />;
      case 'teams':
        return <TeamManagement />;
      case 'projects':
        return <ProjectManagement />;
      case 'reports':
        return <Reports />;
      default:
        const teamTab = teamTabs.find(tab => tab.id === activeTab);
        if (teamTab) {
          return <TeamView teamId={teamTab.teamId} />;
        }
        return <UnifiedView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-700 bg-clip-text text-transparent mb-2">
              PIRA
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Project IT Resource Availability
            </p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white/70 backdrop-blur-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('unified')}
              className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'unified' 
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Unified View
            </button>

            {teamTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            ))}

            <button
              onClick={() => setActiveTab('teams')}
              className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'teams' 
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Teams
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'projects' 
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Projects
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'reports' 
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Reports
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default ProjectManagementApp;
