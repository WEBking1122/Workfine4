export function getOverdueTasks(tasks: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tasks.filter(task => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const isDone =
      task.status?.toLowerCase() === "done" ||
      task.status?.toLowerCase() === "completed";
    return due < today && !isDone;
  });
}
