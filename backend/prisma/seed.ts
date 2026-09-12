import bcrypt from "bcryptjs";
import { PrismaClient, Priority, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.taskStatusLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("Passw0rd!", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Aisha Khan",
      email: "admin@velozity.test",
      passwordHash: password,
      role: "ADMIN",
    },
  });

  const [pmRavi, pmMeera] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ravi Menon",
        email: "pm.ravi@velozity.test",
        passwordHash: password,
        role: "PROJECT_MANAGER",
      },
    }),
    prisma.user.create({
      data: {
        name: "Meera Iyer",
        email: "pm.meera@velozity.test",
        passwordHash: password,
        role: "PROJECT_MANAGER",
      },
    }),
  ]);

  const [devArjun, devSara, devNikhil, devPriya] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Arjun Patel",
        email: "dev.arjun@velozity.test",
        passwordHash: password,
        role: "DEVELOPER",
      },
    }),
    prisma.user.create({
      data: {
        name: "Sara D'Souza",
        email: "dev.sara@velozity.test",
        passwordHash: password,
        role: "DEVELOPER",
      },
    }),
    prisma.user.create({
      data: {
        name: "Nikhil Rao",
        email: "dev.nikhil@velozity.test",
        passwordHash: password,
        role: "DEVELOPER",
      },
    }),
    prisma.user.create({
      data: {
        name: "Priya Nair",
        email: "dev.priya@velozity.test",
        passwordHash: password,
        role: "DEVELOPER",
      },
    }),
  ]);

  const [northwind, lumen, harbor] = await Promise.all([
    prisma.client.create({
      data: { name: "Northwind Retail", email: "it@northwind.example", company: "Northwind" },
    }),
    prisma.client.create({
      data: { name: "Lumen Health", email: "ops@lumen.example", company: "Lumen Health" },
    }),
    prisma.client.create({
      data: { name: "Harbor Logistics", email: "pm@harbor.example", company: "Harbor Logistics" },
    }),
  ]);

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  const projectA = await prisma.project.create({
    data: {
      name: "Northwind Storefront Rebuild",
      description: "New checkout, inventory sync, and merchandising tools.",
      clientId: northwind.id,
      createdById: pmRavi.id,
    },
  });
  const projectB = await prisma.project.create({
    data: {
      name: "Lumen Patient Portal",
      description: "Secure records access and appointment workflows.",
      clientId: lumen.id,
      createdById: pmRavi.id,
    },
  });
  const projectC = await prisma.project.create({
    data: {
      name: "Harbor Route Optimizer",
      description: "Dispatch board, live ETAs, and exception handling.",
      clientId: harbor.id,
      createdById: pmMeera.id,
    },
  });

  type TaskSeed = {
    title: string;
    description: string;
    assignedToId: string;
    status: TaskStatus;
    priority: Priority;
    dueDate: Date;
    isOverdue?: boolean;
    projectId: string;
    creatorId: string;
    creatorName: string;
  };

  const taskSeeds: TaskSeed[] = [
    {
      projectId: projectA.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "Checkout tax engine",
      description: "Port tax rules and add GSTIN validation.",
      assignedToId: devArjun.id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: daysFromNow(3),
    },
    {
      projectId: projectA.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "Inventory webhook retries",
      description: "Idempotent retry worker for POS stock events.",
      assignedToId: devSara.id,
      status: "IN_REVIEW",
      priority: "CRITICAL",
      dueDate: daysFromNow(1),
    },
    {
      projectId: projectA.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "Product image CDN",
      description: "Migrate media to object storage with signed URLs.",
      assignedToId: devArjun.id,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: daysFromNow(10),
    },
    {
      projectId: projectA.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "Abandoned cart emails",
      description: "Template + scheduler for 1h and 24h reminders.",
      assignedToId: devSara.id,
      status: "DONE",
      priority: "LOW",
      dueDate: daysAgo(2),
    },
    {
      projectId: projectA.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "Promo code audit trail",
      description: "Store who created/redeemed codes with timestamps.",
      assignedToId: devArjun.id,
      status: "TODO",
      priority: "HIGH",
      dueDate: daysAgo(4),
      isOverdue: true,
    },
    {
      projectId: projectB.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "OIDC login",
      description: "Hospital IdP integration with refresh rotation.",
      assignedToId: devNikhil.id,
      status: "IN_PROGRESS",
      priority: "CRITICAL",
      dueDate: daysFromNow(2),
    },
    {
      projectId: projectB.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "Lab result PDF viewer",
      description: "Inline viewer with download watermark.",
      assignedToId: devPriya.id,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: daysFromNow(8),
    },
    {
      projectId: projectB.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "Appointment conflict checks",
      description: "Prevent double-booking across clinics.",
      assignedToId: devNikhil.id,
      status: "IN_REVIEW",
      priority: "HIGH",
      dueDate: daysFromNow(4),
    },
    {
      projectId: projectB.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "Accessibility pass",
      description: "WCAG 2.2 AA on booking flow.",
      assignedToId: devPriya.id,
      status: "TODO",
      priority: "LOW",
      dueDate: daysFromNow(14),
    },
    {
      projectId: projectB.id,
      creatorId: pmRavi.id,
      creatorName: "Ravi Menon",
      title: "Audit log export",
      description: "CSV export of PHI access events.",
      assignedToId: devNikhil.id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: daysAgo(1),
      isOverdue: true,
    },
    {
      projectId: projectC.id,
      creatorId: pmMeera.id,
      creatorName: "Meera Iyer",
      title: "Map clustering",
      description: "Cluster 10k vehicle markers without jank.",
      assignedToId: devPriya.id,
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: daysFromNow(5),
    },
    {
      projectId: projectC.id,
      creatorId: pmMeera.id,
      creatorName: "Meera Iyer",
      title: "Delay SLA alerts",
      description: "Push when a route slips past SLA.",
      assignedToId: devSara.id,
      status: "TODO",
      priority: "CRITICAL",
      dueDate: daysFromNow(2),
    },
    {
      projectId: projectC.id,
      creatorId: pmMeera.id,
      creatorName: "Meera Iyer",
      title: "Driver mobile shell",
      description: "Offline-first stop list.",
      assignedToId: devArjun.id,
      status: "IN_REVIEW",
      priority: "MEDIUM",
      dueDate: daysFromNow(6),
    },
    {
      projectId: projectC.id,
      creatorId: pmMeera.id,
      creatorName: "Meera Iyer",
      title: "Fuel receipt OCR",
      description: "Capture and attach receipts to trips.",
      assignedToId: devNikhil.id,
      status: "TODO",
      priority: "LOW",
      dueDate: daysFromNow(12),
    },
    {
      projectId: projectC.id,
      creatorId: pmMeera.id,
      creatorName: "Meera Iyer",
      title: "Exception inbox",
      description: "Dispatcher queue for failed scans.",
      assignedToId: devPriya.id,
      status: "DONE",
      priority: "MEDIUM",
      dueDate: daysAgo(3),
    },
  ];

  const createdTasks = [];
  for (const seed of taskSeeds) {
    const task = await prisma.task.create({
      data: {
        title: seed.title,
        description: seed.description,
        projectId: seed.projectId,
        assignedToId: seed.assignedToId,
        status: seed.status,
        priority: seed.priority,
        dueDate: seed.dueDate,
        isOverdue: Boolean(seed.isOverdue),
      },
    });
    createdTasks.push({ ...seed, task });

    const previous: TaskStatus | null =
      seed.status === "DONE"
        ? "IN_REVIEW"
        : seed.status === "IN_REVIEW"
          ? "IN_PROGRESS"
          : seed.status === "IN_PROGRESS"
            ? "TODO"
            : null;

    await prisma.taskStatusLog.create({
      data: {
        taskId: task.id,
        actorId: seed.creatorId,
        fromStatus: null,
        toStatus: "TODO",
        createdAt: daysAgo(10),
      },
    });
    if (previous) {
      await prisma.taskStatusLog.create({
        data: {
          taskId: task.id,
          actorId: seed.assignedToId,
          fromStatus: previous,
          toStatus: seed.status,
          createdAt: daysAgo(1),
        },
      });
    }

    await prisma.activityEvent.create({
      data: {
        type: "TASK_CREATED",
        actorId: seed.creatorId,
        projectId: seed.projectId,
        taskId: task.id,
        assignedToId: seed.assignedToId,
        taskNumber: task.number,
        toStatus: "TODO",
        summary: `${seed.creatorName} created Task #${task.number}`,
        createdAt: daysAgo(9),
      },
    });
    await prisma.activityEvent.create({
      data: {
        type: "TASK_ASSIGNED",
        actorId: seed.creatorId,
        projectId: seed.projectId,
        taskId: task.id,
        assignedToId: seed.assignedToId,
        taskNumber: task.number,
        summary: `${seed.creatorName} assigned Task #${task.number}`,
        createdAt: daysAgo(8),
      },
    });
    if (previous) {
      const actorName =
        seed.assignedToId === devArjun.id
          ? "Arjun Patel"
          : seed.assignedToId === devSara.id
            ? "Sara D'Souza"
            : seed.assignedToId === devNikhil.id
              ? "Nikhil Rao"
              : "Priya Nair";
      const fromLabel = label(previous);
      const toLabel = label(seed.status);
      await prisma.activityEvent.create({
        data: {
          type: "STATUS_CHANGED",
          actorId: seed.assignedToId,
          projectId: seed.projectId,
          taskId: task.id,
          assignedToId: seed.assignedToId,
          taskNumber: task.number,
          fromStatus: previous,
          toStatus: seed.status,
          summary: `${actorName} moved Task #${task.number} from ${fromLabel} → ${toLabel}`,
          createdAt: daysAgo(1),
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: seed.assignedToId,
        taskId: task.id,
        title: "New task assigned",
        body: `${seed.creatorName} assigned you Task #${task.number}: ${seed.title}`,
        read: seed.status === "DONE",
      },
    });
    if (seed.status === "IN_REVIEW") {
      await prisma.notification.create({
        data: {
          userId: seed.creatorId,
          taskId: task.id,
          title: "Task ready for review",
          body: `A developer moved Task #${task.number} to In Review`,
          read: false,
        },
      });
    }
  }

  console.log(`Seeded ${createdTasks.length} tasks, users, projects, activity, and notifications.`);
  console.log("Login with any seeded account, password: Passw0rd!");
  console.log("admin@velozity.test | pm.ravi@velozity.test | pm.meera@velozity.test");
  console.log("dev.arjun@velozity.test | dev.sara@velozity.test | dev.nikhil@velozity.test | dev.priya@velozity.test");
}

function label(status: TaskStatus) {
  switch (status) {
    case "TODO":
      return "To Do";
    case "IN_PROGRESS":
      return "In Progress";
    case "IN_REVIEW":
      return "In Review";
    case "DONE":
      return "Done";
    default:
      return status;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
