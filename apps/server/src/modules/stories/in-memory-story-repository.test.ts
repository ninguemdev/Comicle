import { InMemoryStoryRepository } from './in-memory-story-repository';
import { runStoryRepositoryContract } from './story-repository.contract';

runStoryRepositoryContract(() => {
  const subject = {
    repository: new InMemoryStoryRepository(),
    reset() {
      subject.repository = new InMemoryStoryRepository();
      return Promise.resolve();
    },
  };
  return subject;
});
