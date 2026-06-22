import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list(ownerId: string) {
    return this.prisma.task.findMany({
      where: { ownerId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(dto: CreateTaskDto, ownerId: string) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        ownerId,
      },
    });
  }

  async update(id: string, dto: UpdateTaskDto, ownerId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.ownerId !== ownerId) throw new ForbiddenException('Not your task');
    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async remove(id: string, ownerId: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.ownerId !== ownerId) throw new ForbiddenException('Not your task');
    await this.prisma.task.delete({ where: { id } });
    return { success: true };
  }
}
